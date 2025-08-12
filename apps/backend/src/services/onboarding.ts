/**
 * User Onboarding Service
 * Provides interactive CLI tools, web dashboard, progress tracking, and drip campaigns
 */

import { AnalyticsService } from './analytics';
import { MarketingAutomationService } from './marketing-automation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'cli' | 'web' | 'config' | 'demo';
  required: boolean;
  estimatedTime: number; // minutes
  prerequisites: string[];
  completed: boolean;
  completedAt?: Date;
}

interface OnboardingProgress {
  userId: string;
  organizationId?: string;
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  progressPercentage: number;
  startedAt: Date;
  lastActivity: Date;
  dropOffPoint?: string;
  timeToComplete?: number; // minutes
}

interface OnboardingAnalytics {
  totalUsers: number;
  completionRate: number;
  averageTimeToComplete: number;
  dropOffPoints: { [stepId: string]: number };
  mostSkippedSteps: string[];
}

export class OnboardingService {
  private analytics: AnalyticsService;
  private marketing: MarketingAutomationService;

  constructor() {
    this.analytics = new AnalyticsService();
    this.marketing = new MarketingAutomationService();
  }

  /**
   * Initialize onboarding for a new user
   */
  async initializeOnboarding(userId: string, organizationId?: string): Promise<OnboardingProgress> {
    const progress: OnboardingProgress = {
      userId,
      organizationId,
      currentStep: 'welcome',
      completedSteps: [],
      totalSteps: this.getOnboardingSteps().length,
      progressPercentage: 0,
      startedAt: new Date(),
      lastActivity: new Date()
    };

    await this.storeOnboardingProgress(progress);
    await this.triggerWelcomeEmail(userId);
    
    // Track onboarding start
    await this.analytics.trackEvent('USER_ONBOARDED', {
      userId,
      organizationId,
      timestamp: new Date().toISOString()
    });

    return progress;
  }

  /**
   * Get interactive CLI onboarding guide
   */
  generateCLIOnboarding(): string {
    return `#!/bin/bash
# Automerge-Pro CLI Onboarding Guide
# This script will guide you through setting up Automerge-Pro for your repository

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

# Unicode symbols
CHECKMARK="✅"
CROSSMARK="❌"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"

echo -e "$CYAN"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    AUTOMERGE-PRO SETUP                      ║"
echo "║            AI-Powered GitHub App Onboarding                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "$NC"

# Function to print status
print_status() {
    echo -e "$GREEN$CHECKMARK $1$NC"
}

print_error() {
    echo -e "$RED$CROSSMARK $1$NC"
}

print_info() {
    echo -e "$BLUE$INFO $1$NC"
}

print_step() {
    echo -e "$PURPLE$GEAR Step $1: $2$NC"
}

# Check prerequisites
echo -e "$YELLOW\\n=== CHECKING PREREQUISITES ===$NC"

# Check if Git is installed
if command -v git &> /dev/null; then
    print_status "Git is installed"
else
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check if user is in a Git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status "You are in a Git repository"
    REPO_NAME=$(basename -s .git \`git config --get remote.origin.url\`)
    print_info "Repository: $REPO_NAME"
else
    print_error "You are not in a Git repository. Please navigate to your repository first."
    exit 1
fi

# Check GitHub CLI
if command -v gh &> /dev/null; then
    print_status "GitHub CLI is available"
    if gh auth status &> /dev/null; then
        print_status "GitHub CLI is authenticated"
    else
        print_info "Please authenticate with GitHub CLI: gh auth login"
        echo "Press Enter to continue after authenticating..."
        read -r
    fi
else
    print_info "GitHub CLI not found. You can install it from: https://cli.github.com/"
fi

echo -e "$YELLOW\\n=== STEP 1: CONFIGURATION SETUP ===$NC"
print_step 1 "Creating .automerge-pro.yml configuration file"

# Check if config file exists
if [ -f ".automerge-pro.yml" ]; then
    echo -e "$YELLOW⚠️  Configuration file already exists.$NC"
    echo "Do you want to:"
    echo "1) Keep existing configuration"
    echo "2) Create a backup and generate new configuration"
    echo "3) Edit existing configuration"
    read -p "Choose option (1-3): " config_choice
    
    case $config_choice in
        1)
            print_info "Keeping existing configuration"
            ;;
        2)
            mv .automerge-pro.yml .automerge-pro.yml.backup
            print_info "Backed up existing configuration"
            ;;
        3)
            if command -v code &> /dev/null; then
                code .automerge-pro.yml
            elif command -v nano &> /dev/null; then
                nano .automerge-pro.yml
            elif command -v vim &> /dev/null; then
                vim .automerge-pro.yml
            else
                echo "Please edit .automerge-pro.yml with your preferred editor"
            fi
            echo "Press Enter when you've finished editing..."
            read -r
            ;;
    esac
else
    # Create new configuration with guided setup
    echo "Let's create your configuration file..."
    
    echo "What type of project is this?"
    echo "1) Web Application (React/Vue/Angular)"
    echo "2) Backend API (Node.js/Python/Go)"
    echo "3) Library/Package"
    echo "4) Documentation"
    echo "5) Other"
    read -p "Choose project type (1-5): " project_type
    
    echo "What's your team size?"
    echo "1) Solo developer (1)"
    echo "2) Small team (2-5)"
    echo "3) Medium team (6-20)"
    echo "4) Large team (20+)"
    read -p "Choose team size (1-4): " team_size
    
    echo "How strict should the auto-merge rules be?"
    echo "1) Conservative (require all checks, manual approval)"
    echo "2) Balanced (require tests, allow auto-approval for trusted users)"
    echo "3) Aggressive (auto-merge on green tests)"
    read -p "Choose strictness level (1-3): " strictness
    
    # Generate config based on choices
    cat > .automerge-pro.yml << EOF
# Automerge-Pro Configuration
# Generated by CLI onboarding tool

version: "1.0"

# Auto-merge rules
rules:
  - name: "Safe Auto-merge"
    conditions:
      - check: "status-checks"
        required: true
      - check: "required-reviews"
        count: $([ "$team_size" -le 2 ] && echo "1" || echo "2")
      - check: "up-to-date"
        required: true
    actions:
      - merge:
          method: $([ "$strictness" -eq 3 ] && echo "squash" || echo "merge")
          delete_branch: true

# AI Analysis settings
ai_analysis:
  enabled: true
  risk_threshold: $([ "$strictness" -eq 1 ] && echo "low" || [ "$strictness" -eq 2 ] && echo "medium" || echo "high")
  skip_draft_prs: true

# Notification preferences  
notifications:
  slack:
    enabled: false
    webhook_url: ""
  email:
    enabled: true
    on_merge: true
    on_conflicts: true

# Branch protection
branch_protection:
  enabled: true
  default_branch_only: true
EOF
    
    print_status "Configuration file created: .automerge-pro.yml"
fi

echo -e "$YELLOW\\n=== STEP 2: GITHUB APP INSTALLATION ===$NC"
print_step 2 "Installing Automerge-Pro GitHub App"

echo "1. Go to: https://github.com/apps/automerge-pro"
echo "2. Click 'Install'"
echo "3. Choose repositories to enable (start with this one: $REPO_NAME)"
echo "4. Review and accept permissions"
echo ""
echo "Press Enter when you've installed the app..."
read -r

# Verify installation
if command -v gh &> /dev/null; then
    if gh api repos/:owner/:repo/installation &> /dev/null; then
        print_status "GitHub App is installed!"
    else
        print_error "GitHub App installation not detected. Please check the installation."
    fi
fi

echo -e "$YELLOW\\n=== STEP 3: TEST CONFIGURATION ===$NC"
print_step 3 "Testing your setup with a demo pull request"

echo "Would you like to create a test pull request to verify everything works?"
echo "This will:"
echo "- Create a test branch"
echo "- Make a small documentation change"
echo "- Create a pull request"
echo "- Let you see Automerge-Pro in action"
echo ""
read -p "Create test PR? (y/n): " create_test

if [[ $create_test == "y" || $create_test == "Y" ]]; then
    # Create test branch
    git checkout -b "automerge-pro-test-$(date +%s)"
    
    # Make a simple change
    echo "# Automerge-Pro Test" > AUTOMERGE_PRO_TEST.md
    echo "This file was created during Automerge-Pro setup to test the configuration." >> AUTOMERGE_PRO_TEST.md
    echo "Date: $(date)" >> AUTOMERGE_PRO_TEST.md
    
    git add AUTOMERGE_PRO_TEST.md
    git commit -m "test: Add Automerge-Pro test file

This is a test commit to verify Automerge-Pro configuration.

- Tests basic auto-merge functionality
- Verifies GitHub App permissions
- Validates configuration file

[automerge-pro:test]"
    
    git push origin HEAD
    
    if command -v gh &> /dev/null; then
        gh pr create --title "🧪 Test: Automerge-Pro Configuration" \\
                     --body "This is a test PR created during Automerge-Pro onboarding.

**What it tests:**
- Configuration file validation
- GitHub App permissions
- Auto-merge rules
- AI analysis capabilities

This PR should be automatically processed by Automerge-Pro. Check the PR page for:
- ✅ Status checks
- 🤖 AI analysis comments
- 🔄 Auto-merge eligibility

**Next Steps:**
1. Watch this PR get processed
2. Check the merge result
3. Review any feedback from Automerge-Pro

If everything looks good, this confirms your setup is working correctly!" \\
                     --label "automerge-pro:test"
        
        print_status "Test pull request created! Check GitHub to see Automerge-Pro in action."
        
        # Get PR URL
        PR_URL=$(gh pr view --json url --jq .url)
        echo -e "$CYAN$ROCKET PR URL: $PR_URL$NC"
    else
        print_info "Pushed test branch. Please create a pull request manually to test."
    fi
fi

echo -e "$YELLOW\\n=== STEP 4: NEXT STEPS ===$NC"
print_step 4 "Completing your onboarding"

echo -e "$GREEN\\n🎉 Congratulations! Automerge-Pro is now set up!$NC"
echo ""
echo -e "$CYAN📋 What's next:$NC"
echo "1. 📖 Read the documentation: https://automerge-pro.dev/docs"
echo "2. 🎯 Customize your rules in .automerge-pro.yml"
echo "3. 👥 Invite team members to the repository"
echo "4. 🔔 Set up Slack/email notifications"
echo "5. 📊 Monitor your automation in the dashboard"
echo ""
echo -e "$CYAN🔗 Useful Links:$NC"
echo "• Dashboard: https://automerge-pro.dev/dashboard"
echo "• Documentation: https://automerge-pro.dev/docs"
echo "• Support: https://github.com/MichaelWBrennan-Org/Automerge-Pro/issues"
echo "• Community: https://discord.gg/automerge-pro"
echo ""
echo -e "$YELLOW💡 Tips:$NC"
echo "• Start with conservative settings and gradually increase automation"
echo "• Use labels like [automerge-pro:skip] to bypass automation when needed"
echo "• Check the AI analysis comments to understand decision-making"
echo "• Review merge reports to optimize your rules"
echo ""
echo -e "$GREEN✨ Happy merging!$NC"

# Store completion analytics
if command -v curl &> /dev/null; then
    curl -s -X POST "https://api.automerge-pro.dev/api/onboarding/completed" \\
         -H "Content-Type: application/json" \\
         -d "{\\"repository\\": \\"$REPO_NAME\\", \\"timestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}" > /dev/null 2>&1
fi
`;
  }

  /**
   * Get all onboarding steps
   */
  private getOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to Automerge-Pro',
        description: 'Learn what Automerge-Pro can do for your team',
        type: 'web',
        required: true,
        estimatedTime: 5,
        prerequisites: [],
        completed: false
      },
      {
        id: 'install_app',
        title: 'Install GitHub App',
        description: 'Install Automerge-Pro on your repositories',
        type: 'web',
        required: true,
        estimatedTime: 3,
        prerequisites: ['welcome'],
        completed: false
      },
      {
        id: 'create_config',
        title: 'Create Configuration',
        description: 'Set up your .automerge-pro.yml file',
        type: 'config',
        required: true,
        estimatedTime: 10,
        prerequisites: ['install_app'],
        completed: false
      },
      {
        id: 'cli_setup',
        title: 'CLI Setup (Optional)',
        description: 'Install and configure the CLI tool for advanced features',
        type: 'cli',
        required: false,
        estimatedTime: 5,
        prerequisites: ['create_config'],
        completed: false
      },
      {
        id: 'test_pr',
        title: 'Test Pull Request',
        description: 'Create a test PR to see Automerge-Pro in action',
        type: 'demo',
        required: true,
        estimatedTime: 5,
        prerequisites: ['create_config'],
        completed: false
      },
      {
        id: 'team_setup',
        title: 'Team Configuration',
        description: 'Set up rules for team members and permissions',
        type: 'config',
        required: false,
        estimatedTime: 15,
        prerequisites: ['test_pr'],
        completed: false
      },
      {
        id: 'notifications',
        title: 'Configure Notifications',
        description: 'Set up Slack, email, or webhook notifications',
        type: 'config',
        required: false,
        estimatedTime: 10,
        prerequisites: ['test_pr'],
        completed: false
      },
      {
        id: 'dashboard_tour',
        title: 'Dashboard Tour',
        description: 'Explore analytics and monitoring features',
        type: 'web',
        required: false,
        estimatedTime: 8,
        prerequisites: ['test_pr'],
        completed: false
      }
    ];
  }

  /**
   * Complete an onboarding step
   */
  async completeStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(userId);
    
    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
      progress.lastActivity = new Date();
      
      // Calculate new progress
      progress.progressPercentage = (progress.completedSteps.length / progress.totalSteps) * 100;
      
      // Update current step to next incomplete step
      const steps = this.getOnboardingSteps();
      const nextStep = steps.find(step => 
        !progress.completedSteps.includes(step.id) && 
        step.prerequisites.every(prereq => progress.completedSteps.includes(prereq))
      );
      
      if (nextStep) {
        progress.currentStep = nextStep.id;
      } else {
        // All steps completed
        progress.currentStep = 'completed';
        progress.timeToComplete = Math.round(
          (progress.lastActivity.getTime() - progress.startedAt.getTime()) / (1000 * 60)
        );
        
        await this.triggerCompletionEmail(userId);
      }
      
      await this.storeOnboardingProgress(progress);
      
      // Track step completion
      await this.analytics.trackEvent('ONBOARDING_STEP_COMPLETED', {
        userId,
        stepId,
        progressPercentage: progress.progressPercentage,
        timestamp: new Date().toISOString()
      });
      
      // Trigger milestone emails
      await this.checkMilestoneEmails(progress);
    }
    
    return progress;
  }

  /**
   * Get onboarding progress for a user
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
    // Implementation would retrieve from database
    // For now, return a mock progress
    return {
      userId,
      currentStep: 'welcome',
      completedSteps: [],
      totalSteps: this.getOnboardingSteps().length,
      progressPercentage: 0,
      startedAt: new Date(),
      lastActivity: new Date()
    };
  }

  /**
   * Generate web onboarding dashboard
   */
  generateWebDashboard(userId: string, progress: OnboardingProgress): string {
    const steps = this.getOnboardingSteps();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automerge-Pro Onboarding</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .logo {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            width: ${progress.progressPercentage}%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            text-align: center;
            margin-top: 10px;
            color: #666;
            font-size: 14px;
        }
        
        .steps {
            margin-top: 30px;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 16px;
            transition: all 0.2s ease;
        }
        
        .step.completed {
            background: #f8fff4;
            border-color: #4caf50;
        }
        
        .step.current {
            background: #fff8e1;
            border-color: #ff9800;
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
        }
        
        .step-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            flex-shrink: 0;
            font-weight: bold;
            font-size: 18px;
        }
        
        .step.completed .step-icon {
            background: #4caf50;
            color: white;
        }
        
        .step.current .step-icon {
            background: #ff9800;
            color: white;
        }
        
        .step.pending .step-icon {
            background: #f0f0f0;
            color: #999;
        }
        
        .step-content {
            flex: 1;
        }
        
        .step-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .step-description {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .step-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #999;
        }
        
        .step-actions {
            margin-top: 12px;
        }
        
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #5a6fd8;
        }
        
        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
        }
        
        .completion-message {
            text-align: center;
            padding: 40px 20px;
            background: #f8fff4;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .completion-message h2 {
            color: #4caf50;
            margin-bottom: 16px;
        }
        
        .helpful-links {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .helpful-links h3 {
            margin-top: 0;
            color: #333;
        }
        
        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .link-card {
            padding: 16px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s ease;
        }
        
        .link-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .link-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .link-desc {
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚀 Automerge-Pro</div>
            <h1>Welcome to your setup journey</h1>
            <p>Let's get you up and running with automated pull request management!</p>
            
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">
                ${progress.completedSteps.length} of ${progress.totalSteps} steps completed (${Math.round(progress.progressPercentage)}%)
            </div>
        </div>
        
        ${progress.progressPercentage >= 100 ? `
            <div class="completion-message">
                <h2>🎉 Congratulations!</h2>
                <p>You've completed the onboarding process. Automerge-Pro is now ready to help automate your workflow!</p>
                <a href="/dashboard" class="btn">Go to Dashboard</a>
            </div>
        ` : ''}
        
        <div class="steps">
            ${steps.map((step, index) => {
              const isCompleted = progress.completedSteps.includes(step.id);
              const isCurrent = progress.currentStep === step.id;
              const isPending = !isCompleted && !isCurrent;
              const canStart = step.prerequisites.every(prereq => progress.completedSteps.includes(prereq));
              
              return `
                <div class="step ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}">
                    <div class="step-icon">
                        ${isCompleted ? '✓' : isCurrent ? '◉' : index + 1}
                    </div>
                    <div class="step-content">
                        <div class="step-title">${step.title}</div>
                        <div class="step-description">${step.description}</div>
                        <div class="step-meta">
                            <span>⏱️ ${step.estimatedTime} min</span>
                            <span>📋 ${step.type.toUpperCase()}</span>
                            ${step.required ? '<span>⚠️ Required</span>' : '<span>🎯 Optional</span>'}
                        </div>
                        ${(isCurrent || (isPending && canStart)) ? `
                            <div class="step-actions">
                                ${this.getStepActionButton(step)}
                            </div>
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="helpful-links">
            <h3>📚 Helpful Resources</h3>
            <div class="links-grid">
                <a href="https://automerge-pro.dev/docs" class="link-card">
                    <div class="link-title">📖 Documentation</div>
                    <div class="link-desc">Complete setup and usage guide</div>
                </a>
                <a href="https://automerge-pro.dev/examples" class="link-card">
                    <div class="link-title">💡 Examples</div>
                    <div class="link-desc">Sample configurations for different project types</div>
                </a>
                <a href="https://github.com/MichaelWBrennan-Org/Automerge-Pro/issues" class="link-card">
                    <div class="link-title">💬 Support</div>
                    <div class="link-desc">Get help from the community</div>
                </a>
                <a href="https://automerge-pro.dev/dashboard" class="link-card">
                    <div class="link-title">📊 Dashboard</div>
                    <div class="link-desc">Monitor your automation metrics</div>
                </a>
            </div>
        </div>
    </div>
    
    <script>
        // Track page view
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: 'Onboarding Dashboard',
                page_location: window.location.href
            });
        }
        
        // Complete step function
        function completeStep(stepId) {
            fetch('/api/onboarding/complete-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: '${userId}', stepId })
            }).then(() => {
                location.reload();
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Get analytics on onboarding performance
   */
  async getOnboardingAnalytics(): Promise<OnboardingAnalytics> {
    // Implementation would query database for real metrics
    return {
      totalUsers: 1250,
      completionRate: 73.2,
      averageTimeToComplete: 45,
      dropOffPoints: {
        'create_config': 18.5,
        'test_pr': 12.3,
        'team_setup': 8.7
      },
      mostSkippedSteps: ['cli_setup', 'notifications', 'dashboard_tour']
    };
  }

  /**
   * Trigger drip email campaigns based on onboarding progress
   */
  private async checkMilestoneEmails(progress: OnboardingProgress): Promise<void> {
    const milestones = [
      { threshold: 25, template: 'onboarding_25_percent' },
      { threshold: 50, template: 'onboarding_halfway' },
      { threshold: 75, template: 'onboarding_almost_done' }
    ];

    for (const milestone of milestones) {
      if (progress.progressPercentage >= milestone.threshold && 
          progress.progressPercentage < milestone.threshold + 20) {
        await this.triggerMilestoneEmail(progress.userId, milestone.template, progress);
      }
    }
  }

  /**
   * Helper methods for data storage and email triggering
   */
  private async storeOnboardingProgress(progress: OnboardingProgress): Promise<void> {
    // Implementation would store in database
    console.log('Storing onboarding progress:', progress.userId, progress.progressPercentage);
  }

  private async triggerWelcomeEmail(userId: string): Promise<void> {
    try {
      const campaign = await this.marketing.generateEmailCampaign('onboarding');
      // Send welcome email
      console.log('Triggering welcome email for:', userId);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  private async triggerCompletionEmail(userId: string): Promise<void> {
    console.log('Triggering completion email for:', userId);
  }

  private async triggerMilestoneEmail(userId: string, template: string, progress: OnboardingProgress): Promise<void> {
    console.log(`Triggering ${template} email for:`, userId, `${progress.progressPercentage}% complete`);
  }

  private getStepActionButton(step: OnboardingStep): string {
    switch (step.type) {
      case 'web':
        return '<button class="btn" onclick="completeStep(\'${step.id}\')">Start Step</button>';
      case 'config':
        return '<a href="/config-editor?step=${step.id}" class="btn">Configure</a>';
      case 'cli':
        return '<a href="/cli-download" class="btn">Download CLI</a>';
      case 'demo':
        return '<a href="/demo?step=${step.id}" class="btn">Try Demo</a>';
      default:
        return '<button class="btn" onclick="completeStep(\'${step.id}\')">Continue</button>';
    }
  }
}