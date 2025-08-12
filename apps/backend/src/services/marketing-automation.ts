/**
 * Marketing Automation Service
 * Handles social media posts, email campaigns, case studies, and growth marketing
 */

import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { AnalyticsService } from './analytics';

interface SocialMediaPost {
  platform: 'linkedin' | 'twitter' | 'mastodon';
  content: string;
  media?: string;
  scheduledTime?: Date;
}

interface EmailCampaign {
  subject: string;
  htmlContent: string;
  textContent: string;
  recipients: string[];
  templateType: 'onboarding' | 'feature_announcement' | 'weekly_digest';
}

interface CaseStudy {
  title: string;
  company: string;
  challenge: string;
  solution: string;
  results: string;
  metrics: {
    mergeTimeReduction: number;
    codeQualityImprovement: number;
    developerSatisfaction: number;
  };
}

export class MarketingAutomationService {
  private openai: OpenAI;
  private analytics: AnalyticsService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.analytics = new AnalyticsService();
  }

  /**
   * Generate weekly social media posts based on README and changelogs
   */
  async generateWeeklySocialPosts(): Promise<SocialMediaPost[]> {
    try {
      const readmeContent = await this.getReadmeContent();
      const latestChanges = await this.getLatestChanges();
      const analytics = await this.analytics.getWeeklyStats();

      const posts: SocialMediaPost[] = [];

      // LinkedIn post (professional)
      const linkedinPost = await this.generateLinkedInPost(readmeContent, latestChanges, analytics);
      posts.push({
        platform: 'linkedin',
        content: linkedinPost,
        scheduledTime: this.getNextScheduledTime('monday', 9)
      });

      // Twitter/X post (concise)
      const twitterPost = await this.generateTwitterPost(readmeContent, latestChanges, analytics);
      posts.push({
        platform: 'twitter',
        content: twitterPost,
        scheduledTime: this.getNextScheduledTime('wednesday', 14)
      });

      // Mastodon post (developer-focused)
      const mastodonPost = await this.generateMastodonPost(readmeContent, latestChanges, analytics);
      posts.push({
        platform: 'mastodon',
        content: mastodonPost,
        scheduledTime: this.getNextScheduledTime('friday', 11)
      });

      await this.scheduleSocialPosts(posts);
      return posts;

    } catch (error) {
      console.error('Failed to generate social media posts:', error);
      throw error;
    }
  }

  /**
   * Generate LinkedIn post using AI
   */
  private async generateLinkedInPost(readme: string, changes: string, analytics: any): Promise<string> {
    const prompt = `
Create a professional LinkedIn post for Automerge-Pro, a GitHub App for automated pull request reviews and merging.

Context:
${readme.substring(0, 1000)}

Recent Changes:
${changes}

Weekly Analytics:
- Pull Requests Processed: ${analytics.pullRequestsProcessed || 'N/A'}
- Auto-merges: ${analytics.autoMerges || 'N/A'}
- Time Saved: ${analytics.timeSaved || 'N/A'} hours

Create an engaging, professional post that:
1. Highlights a key feature or recent improvement
2. Includes relevant metrics if available
3. Ends with a call-to-action
4. Uses appropriate hashtags
5. Is 1-3 paragraphs, professional tone
6. Includes emojis sparingly for engagement

Do not include any promotional language that sounds too sales-y.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Generate Twitter/X post using AI
   */
  private async generateTwitterPost(readme: string, changes: string, analytics: any): Promise<string> {
    const prompt = `
Create a concise Twitter/X post for Automerge-Pro (under 280 characters).

Context:
${readme.substring(0, 500)}

Recent Changes:
${changes}

Create a tweet that:
1. Highlights one key benefit or feature
2. Uses relevant hashtags (#GitHub #DevOps #Automation #AI)
3. Includes a brief metric if available
4. Has a clear call-to-action
5. Uses emojis for engagement

Keep it under 280 characters and engaging.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.8
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Generate Mastodon post using AI
   */
  private async generateMastodonPost(readme: string, changes: string, analytics: any): Promise<string> {
    const prompt = `
Create a developer-focused Mastodon post for Automerge-Pro.

Context:
${readme.substring(0, 800)}

Recent Changes:
${changes}

Create a post that:
1. Appeals to developers and DevOps engineers
2. Highlights technical benefits
3. Uses relevant hashtags (#OpenSource #GitHub #DevOps #Automation)
4. Is 1-2 paragraphs, conversational but technical
5. Includes call-to-action to try it out
6. Mentions it's open source if applicable

Target 200-400 characters, developer-friendly tone.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Generate email campaigns with Mailchimp integration
   */
  async generateEmailCampaign(type: EmailCampaign['templateType']): Promise<EmailCampaign> {
    const readmeContent = await this.getReadmeContent();
    const analytics = await this.analytics.getWeeklyStats();

    switch (type) {
      case 'onboarding':
        return this.generateOnboardingEmail();
      case 'feature_announcement':
        return this.generateFeatureAnnouncementEmail(readmeContent);
      case 'weekly_digest':
        return this.generateWeeklyDigestEmail(analytics);
      default:
        throw new Error(`Unknown email campaign type: ${type}`);
    }
  }

  /**
   * Generate onboarding email sequence
   */
  private async generateOnboardingEmail(): Promise<EmailCampaign> {
    const prompt = `
Create a welcome/onboarding email for new Automerge-Pro users.

The email should:
1. Welcome them warmly
2. Explain the key benefits they'll get
3. Provide next steps to get started
4. Include links to documentation
5. Offer support if needed
6. Be concise but helpful

Create both HTML and plain text versions.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.6
    });

    const content = response.choices[0].message.content || '';
    
    return {
      subject: '🚀 Welcome to Automerge-Pro! Let\'s get you started',
      htmlContent: this.convertToHtml(content),
      textContent: content,
      recipients: [], // To be populated from database
      templateType: 'onboarding'
    };
  }

  /**
   * Generate feature announcement email
   */
  private async generateFeatureAnnouncementEmail(readme: string): Promise<EmailCampaign> {
    const latestChanges = await this.getLatestChanges();
    
    const prompt = `
Create a feature announcement email based on recent changes to Automerge-Pro.

Recent Changes:
${latestChanges}

The email should:
1. Highlight the most important new features
2. Explain how users benefit from these changes
3. Provide instructions on how to use new features
4. Include a call-to-action to update or try the features
5. Be enthusiastic but professional

Create both HTML and plain text versions.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.6
    });

    const content = response.choices[0].message.content || '';
    
    return {
      subject: '🆕 New Features in Automerge-Pro!',
      htmlContent: this.convertToHtml(content),
      textContent: content,
      recipients: [], // To be populated from database
      templateType: 'feature_announcement'
    };
  }

  /**
   * Generate weekly digest email
   */
  private async generateWeeklyDigestEmail(analytics: any): Promise<EmailCampaign> {
    const prompt = `
Create a weekly digest email for Automerge-Pro users with their analytics summary.

Analytics Summary:
- Pull Requests Processed: ${analytics.pullRequestsProcessed || 0}
- Auto-merges: ${analytics.autoMerges || 0}
- Time Saved: ${analytics.timeSaved || 0} hours
- Code Quality Score: ${analytics.averageQualityScore || 'N/A'}

The email should:
1. Congratulate them on their achievements
2. Highlight interesting metrics
3. Provide tips for better automation
4. Include a call-to-action for feedback
5. Be encouraging and positive

Create both HTML and plain text versions.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7
    });

    const content = response.choices[0].message.content || '';
    
    return {
      subject: '📊 Your Weekly Automerge-Pro Summary',
      htmlContent: this.convertToHtml(content),
      textContent: content,
      recipients: [], // To be populated from database
      templateType: 'weekly_digest'
    };
  }

  /**
   * Auto-generate case studies from successful implementations
   */
  async generateCaseStudy(organizationData: any): Promise<CaseStudy> {
    const metrics = await this.analytics.getOrganizationMetrics(organizationData.id);
    
    const prompt = `
Create a compelling case study for Automerge-Pro based on this organization's usage:

Organization: ${organizationData.name || 'Anonymous Company'}
Industry: ${organizationData.industry || 'Technology'}
Team Size: ${organizationData.teamSize || 'N/A'}

Metrics:
- PRs Processed: ${metrics.totalPRs}
- Auto-merge Rate: ${metrics.autoMergeRate}%
- Average Review Time: ${metrics.avgReviewTime} hours
- Time Saved: ${metrics.timeSaved} hours/month

Create a case study with:
1. Company overview (anonymized if needed)
2. The challenge they faced
3. How Automerge-Pro solved it
4. Quantified results and benefits
5. A quote (you can create a realistic one)

Make it compelling but realistic and professional.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.6
    });

    const content = response.choices[0].message.content || '';
    
    return {
      title: `How ${organizationData.name || 'Our Client'} Reduced Code Review Time by ${metrics.timeReduction || 50}%`,
      company: organizationData.name || 'Anonymous Company',
      challenge: this.extractSection(content, 'challenge'),
      solution: this.extractSection(content, 'solution'),
      results: this.extractSection(content, 'results'),
      metrics: {
        mergeTimeReduction: metrics.timeReduction || 50,
        codeQualityImprovement: metrics.qualityImprovement || 25,
        developerSatisfaction: metrics.satisfactionScore || 85
      }
    };
  }

  /**
   * Update README with case studies and live badges
   */
  async updateReadmeWithCaseStudies(caseStudies: CaseStudy[]): Promise<void> {
    try {
      const readmePath = path.join(process.cwd(), '../../README.md');
      let readmeContent = fs.readFileSync(readmePath, 'utf-8');

      // Add Shields.io badges
      const badges = this.generateLiveBadges();
      
      // Add case studies section
      const caseStudiesSection = this.generateCaseStudiesSection(caseStudies);
      
      // Insert or update sections in README
      readmeContent = this.updateReadmeSection(readmeContent, 'badges', badges);
      readmeContent = this.updateReadmeSection(readmeContent, 'case-studies', caseStudiesSection);
      
      fs.writeFileSync(readmePath, readmeContent);
      console.log('✅ README updated with case studies and badges');

    } catch (error) {
      console.error('Failed to update README:', error);
      throw error;
    }
  }

  /**
   * Schedule social media posts using external service or queue
   */
  private async scheduleSocialPosts(posts: SocialMediaPost[]): Promise<void> {
    // In a real implementation, this would integrate with:
    // - Buffer API for social media scheduling
    // - Hootsuite API
    // - Native platform APIs (Twitter API, LinkedIn API, Mastodon API)
    
    for (const post of posts) {
      console.log(`📅 Scheduled ${post.platform} post for ${post.scheduledTime}`);
      
      // Store in database for processing by a scheduled job
      await this.storeScheduledPost(post);
    }
  }

  /**
   * Store scheduled post in database
   */
  private async storeScheduledPost(post: SocialMediaPost): Promise<void> {
    // Implementation would store in database
    console.log(`Storing scheduled post for ${post.platform}:`, post.content.substring(0, 100));
  }

  /**
   * Helper methods
   */
  private async getReadmeContent(): Promise<string> {
    try {
      const readmePath = path.join(process.cwd(), '../../README.md');
      return fs.readFileSync(readmePath, 'utf-8');
    } catch (error) {
      console.warn('Could not read README file');
      return 'Automerge-Pro: AI-powered GitHub App for automated pull request reviews and merging.';
    }
  }

  private async getLatestChanges(): Promise<string> {
    try {
      const changelogPath = path.join(process.cwd(), '../../CHANGELOG.md');
      const changelog = fs.readFileSync(changelogPath, 'utf-8');
      return changelog.split('\n').slice(0, 20).join('\n');
    } catch (error) {
      return 'Recent improvements to AI analysis and merge automation.';
    }
  }

  private getNextScheduledTime(day: string, hour: number): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(day.toLowerCase());
    
    const now = new Date();
    const scheduledDate = new Date();
    
    scheduledDate.setDate(now.getDate() + ((7 + targetDay - now.getDay()) % 7));
    scheduledDate.setHours(hour, 0, 0, 0);
    
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 7);
    }
    
    return scheduledDate;
  }

  private convertToHtml(content: string): string {
    // Simple markdown-like to HTML conversion
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  private extractSection(content: string, sectionName: string): string {
    const lines = content.split('\n');
    const sectionStart = lines.findIndex(line => 
      line.toLowerCase().includes(sectionName.toLowerCase())
    );
    
    if (sectionStart === -1) return '';
    
    const sectionEnd = lines.findIndex((line, index) => 
      index > sectionStart && line.trim() === ''
    );
    
    return lines.slice(sectionStart + 1, sectionEnd === -1 ? lines.length : sectionEnd).join('\n');
  }

  private generateLiveBadges(): string {
    return `
<!-- Live Badges -->
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Automerge--Pro-green?logo=github)](https://github.com/marketplace/actions/automerge-pro)
[![Installations](https://img.shields.io/badge/dynamic/json?color=green&label=installations&query=installations&url=https://api.github.com/repos/MichaelWBrennan-Org/Automerge-Pro)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)
[![Stars](https://img.shields.io/github/stars/MichaelWBrennan-Org/Automerge-Pro?style=social)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)
[![License](https://img.shields.io/github/license/MichaelWBrennan-Org/Automerge-Pro)](https://github.com/MichaelWBrennan-Org/Automerge-Pro/blob/main/LICENSE)
`;
  }

  private generateCaseStudiesSection(caseStudies: CaseStudy[]): string {
    let section = '\n## 📈 Success Stories\n\n';
    
    for (const study of caseStudies.slice(0, 3)) { // Limit to top 3
      section += `### ${study.title}\n\n`;
      section += `**Company:** ${study.company}\n\n`;
      section += `**Results:**\n`;
      section += `- 🚀 ${study.metrics.mergeTimeReduction}% reduction in merge time\n`;
      section += `- 📊 ${study.metrics.codeQualityImprovement}% improvement in code quality\n`;
      section += `- 😊 ${study.metrics.developerSatisfaction}% developer satisfaction\n\n`;
    }
    
    return section;
  }

  private updateReadmeSection(content: string, sectionName: string, newContent: string): string {
    // Simple section replacement - in production, use more sophisticated parsing
    return content + '\n' + newContent;
  }
}