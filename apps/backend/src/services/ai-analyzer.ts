import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface PRAnalysisInput {
  title: string;
  body: string;
  files: PRFile[];
  author: string;
  baseBranch: string;
  headBranch: string;
}

export interface PRAnalysisResult {
  riskScore: number; // 0-1, where 1 is highest risk
  summary: string;
  concerns: string[];
  recommendations: string[];
  autoApprovalRecommended: boolean;
  categories: {
    security: number;
    breaking: number;
    complexity: number;
    testing: number;
    documentation: number;
  };
}

export async function analyzeNextFilesPullRequest(input: PRAnalysisInput): Promise<PRAnalysisResult> {
  const systemPrompt = `You are an expert code reviewer analyzing pull requests for risk assessment and auto-merge suitability. 

Analyze the provided pull request and return a JSON response with the following structure:
{
  "riskScore": number (0-1, where 1 is highest risk),
  "summary": "Brief summary of the changes",
  "concerns": ["array of specific concerns"],
  "recommendations": ["array of recommendations"],
  "autoApprovalRecommended": boolean,
  "categories": {
    "security": number (0-1),
    "breaking": number (0-1),
    "complexity": number (0-1),
    "testing": number (0-1),
    "documentation": number (0-1)
  }
}

Key risk factors to consider:
- Security vulnerabilities or auth changes
- Breaking API changes
- Complex logic without tests
- Changes to critical files (config, migrations, auth)
- Large file modifications
- Missing or inadequate tests
- Poor code quality or style
- Changes to build/deploy configs
- Database schema changes
- External dependency updates

Low risk factors:
- Documentation updates
- Minor bug fixes
- Test additions
- Code formatting
- Small feature additions with tests
- Configuration updates (non-breaking)

Provide specific, actionable feedback.`;

  const userPrompt = `Analyze this pull request:

**Title:** ${input.title}

**Description:**
${input.body}

**Author:** ${input.author}
**Base Branch:** ${input.baseBranch}
**Head Branch:** ${input.headBranch}

**Files Changed (${input.files.length} files):**
${input.files.map(file => `
- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})
${file.patch ? `\`\`\`diff\n${file.patch.slice(0, 2000)}${file.patch.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\`` : ''}
`).join('\n')}`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content) as PRAnalysisResult;
    
    // Validate and sanitize the response
    return {
      riskScore: Math.max(0, Math.min(1, analysis.riskScore || 0)),
      summary: analysis.summary || 'No summary provided',
      concerns: Array.isArray(analysis.concerns) ? analysis.concerns.slice(0, 10) : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 10) : [],
      autoApprovalRecommended: Boolean(analysis.autoApprovalRecommended),
      categories: {
        security: Math.max(0, Math.min(1, analysis.categories?.security || 0)),
        breaking: Math.max(0, Math.min(1, analysis.categories?.breaking || 0)),
        complexity: Math.max(0, Math.min(1, analysis.categories?.complexity || 0)),
        testing: Math.max(0, Math.min(1, analysis.categories?.testing || 0)),
        documentation: Math.max(0, Math.min(1, analysis.categories?.documentation || 0))
      }
    };
  } catch (error) {
    console.error('Error analyzing PR with AI:', error);
    
    // Fallback analysis based on simple heuristics
    return generateFallbackAnalysis(input);
  }
}

function generateFallbackAnalysis(input: PRAnalysisInput): PRAnalysisResult {
  let riskScore = 0;
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // File-based risk assessment
  const criticalFiles = input.files.filter(f => 
    f.filename.includes('auth') ||
    f.filename.includes('security') ||
    f.filename.includes('migration') ||
    f.filename.includes('config') ||
    f.filename.endsWith('.env') ||
    f.filename.includes('package.json') ||
    f.filename.includes('Dockerfile')
  );

  if (criticalFiles.length > 0) {
    riskScore += 0.3;
    concerns.push(`Changes to critical files: ${criticalFiles.map(f => f.filename).join(', ')}`);
  }

  // Size-based risk
  const totalChanges = input.files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  if (totalChanges > 500) {
    riskScore += 0.2;
    concerns.push(`Large changeset: ${totalChanges} lines modified`);
  }

  // Test file check
  const hasTests = input.files.some(f => 
    f.filename.includes('test') || 
    f.filename.includes('spec') ||
    f.filename.includes('__tests__')
  );

  if (!hasTests && input.files.length > 2) {
    riskScore += 0.2;
    concerns.push('No test files included in changeset');
    recommendations.push('Add tests for the new functionality');
  }

  // Branch name analysis
  if (input.headBranch.includes('hotfix') || input.headBranch.includes('urgent')) {
    riskScore += 0.1;
    concerns.push('Urgent/hotfix branch detected');
  }

  return {
    riskScore: Math.min(1, riskScore),
    summary: `Automated analysis: ${input.files.length} files changed, ${totalChanges} total modifications`,
    concerns,
    recommendations,
    autoApprovalRecommended: riskScore < 0.3 && hasTests,
    categories: {
      security: criticalFiles.length > 0 ? 0.5 : 0.1,
      breaking: totalChanges > 1000 ? 0.6 : 0.2,
      complexity: Math.min(1, totalChanges / 1000),
      testing: hasTests ? 0.1 : 0.7,
      documentation: input.files.some(f => f.filename.includes('README') || f.filename.includes('.md')) ? 0.1 : 0.3
    }
  };
}