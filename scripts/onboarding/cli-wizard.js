#!/usr/bin/env node

/**
 * Interactive CLI Onboarding Tool
 * Guides users through AutoMerge Pro setup with step-by-step instructions
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class OnboardingWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {
      version: '1',
      rules: [],
      notifications: {},
      settings: {}
    };
    
    this.colors = {
      reset: '\\033[0m',
      bright: '\\033[1m',
      green: '\\033[32m',
      blue: '\\033[34m',
      yellow: '\\033[33m',
      red: '\\033[31m',
      cyan: '\\033[36m'
    };
  }

  colorize(text, color) {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  async ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async askYesNo(question) {
    const answer = await this.ask(`${question} (y/N): `);
    return answer.toLowerCase().startsWith('y');
  }

  async selectOption(question, options) {
    console.log(`\\n${this.colorize(question, 'bright')}`);
    options.forEach((option, index) => {
      console.log(`  ${this.colorize(index + 1, 'cyan')}. ${option}`);
    });
    
    const answer = await this.ask('\\nSelect option (1-' + options.length + '): ');
    const index = parseInt(answer) - 1;
    
    if (index >= 0 && index < options.length) {
      return { index, value: options[index] };
    }
    
    console.log(this.colorize('Invalid selection. Please try again.', 'red'));
    return this.selectOption(question, options);
  }

  displayWelcome() {
    console.clear();
    console.log(this.colorize(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 Welcome to AutoMerge Pro Setup Wizard!                ║
║                                                              ║
║    This wizard will guide you through setting up AI-powered ║
║    pull request automation for your GitHub repositories.    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `, 'green'));
    
    console.log(`
${this.colorize('What we\\'ll do together:', 'bright')}
  ✓ Check your GitHub App installation
  ✓ Analyze your repository structure  
  ✓ Configure automation rules
  ✓ Set up notifications
  ✓ Test your configuration
  ✓ Deploy to production

${this.colorize('Estimated time:', 'yellow')} 10-15 minutes
`);
  }

  async checkPrerequisites() {
    console.log(this.colorize('\\n📋 Checking Prerequisites...', 'bright'));
    
    const checks = [
      {
        name: 'Node.js version',
        test: () => {
          try {
            const version = execSync('node --version', { encoding: 'utf8' }).trim();
            const major = parseInt(version.slice(1));
            return major >= 18 ? { success: true, value: version } : { success: false, error: 'Node.js 18+ required' };
          } catch (error) {
            return { success: false, error: 'Node.js not found' };
          }
        }
      },
      {
        name: 'Git repository',
        test: () => {
          try {
            execSync('git rev-parse --git-dir', { stdio: 'pipe' });
            const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
            return { success: true, value: remote };
          } catch (error) {
            return { success: false, error: 'Not a git repository or no origin remote' };
          }
        }
      },
      {
        name: 'GitHub CLI (optional)',
        test: () => {
          try {
            const version = execSync('gh --version', { encoding: 'utf8' }).trim().split('\\n')[0];
            return { success: true, value: version };
          } catch (error) {
            return { success: false, error: 'GitHub CLI not installed (optional)' };
          }
        }
      }
    ];

    for (const check of checks) {
      process.stdout.write(`  Checking ${check.name}... `);
      const result = check.test();
      
      if (result.success) {
        console.log(this.colorize(`✓ ${result.value}`, 'green'));
      } else {
        console.log(this.colorize(`✗ ${result.error}`, result.error.includes('optional') ? 'yellow' : 'red'));
        if (!result.error.includes('optional')) {
          console.log(this.colorize(`\\n❌ Prerequisites not met. Please install required tools and try again.`, 'red'));
          process.exit(1);
        }
      }
    }
    
    console.log(this.colorize('\\n✅ Prerequisites check complete!', 'green'));
  }

  async analyzeRepository() {
    console.log(this.colorize('\\n🔍 Analyzing Repository Structure...', 'bright'));
    
    const analysis = {
      language: this.detectPrimaryLanguage(),
      framework: this.detectFramework(),
      hasTests: this.hasTestDirectory(),
      hasDocs: this.hasDocumentation(),
      hasCI: this.hasContinuousIntegration(),
      packageFiles: this.findPackageFiles()
    };
    
    console.log(`
${this.colorize('Repository Analysis:', 'cyan')}
  📝 Primary Language: ${this.colorize(analysis.language, 'bright')}
  🏗️  Framework: ${this.colorize(analysis.framework, 'bright')}
  🧪 Tests: ${this.colorize(analysis.hasTests ? '✓ Found' : '✗ None found', analysis.hasTests ? 'green' : 'yellow')}
  📚 Documentation: ${this.colorize(analysis.hasDocs ? '✓ Found' : '✗ None found', analysis.hasDocs ? 'green' : 'yellow')}
  🔄 CI/CD: ${this.colorize(analysis.hasCI ? '✓ Found' : '✗ None found', analysis.hasCI ? 'green' : 'yellow')}
  📦 Package Files: ${this.colorize(analysis.packageFiles.length + ' found', 'bright')}
    `);
    
    return analysis;
  }

  detectPrimaryLanguage() {
    const languageFiles = {
      'JavaScript/Node.js': ['package.json', '*.js', '*.ts'],
      'Python': ['requirements.txt', 'setup.py', '*.py'],
      'Java': ['pom.xml', 'build.gradle', '*.java'],
      'Go': ['go.mod', '*.go'],
      'Ruby': ['Gemfile', '*.rb'],
      'PHP': ['composer.json', '*.php'],
      'C#': ['*.csproj', '*.cs'],
      'Rust': ['Cargo.toml', '*.rs']
    };

    for (const [language, patterns] of Object.entries(languageFiles)) {
      for (const pattern of patterns) {
        if (this.fileExists(pattern)) {
          return language;
        }
      }
    }
    
    return 'Unknown';
  }

  detectFramework() {
    const frameworks = {
      'Next.js': 'next.config.js',
      'React': 'src/App.js',
      'Vue.js': 'vue.config.js',
      'Angular': 'angular.json',
      'Express.js': ['app.js', 'server.js'],
      'NestJS': 'nest-cli.json',
      'Django': 'manage.py',
      'Flask': 'app.py',
      'Spring Boot': 'application.properties',
      'Ruby on Rails': 'Gemfile'
    };

    for (const [framework, files] of Object.entries(frameworks)) {
      const fileList = Array.isArray(files) ? files : [files];
      if (fileList.some(file => this.fileExists(file))) {
        return framework;
      }
    }
    
    return 'Unknown';
  }

  hasTestDirectory() {
    const testPaths = ['test/', 'tests/', '__tests__/', 'spec/', 'cypress/'];
    return testPaths.some(path => fs.existsSync(path));
  }

  hasDocumentation() {
    const docFiles = ['README.md', 'docs/', 'documentation/'];
    return docFiles.some(path => fs.existsSync(path));
  }

  hasContinuousIntegration() {
    const ciFiles = ['.github/workflows/', '.gitlab-ci.yml', '.travis.yml', 'Jenkinsfile'];
    return ciFiles.some(path => fs.existsSync(path));
  }

  findPackageFiles() {
    const packageFiles = ['package.json', 'requirements.txt', 'Gemfile', 'composer.json', 'go.mod', 'Cargo.toml'];
    return packageFiles.filter(file => fs.existsSync(file));
  }

  fileExists(pattern) {
    if (pattern.includes('*')) {
      try {
        const result = execSync(`find . -name "${pattern}" -type f | head -1`, { encoding: 'utf8' }).trim();
        return result.length > 0;
      } catch (error) {
        return false;
      }
    }
    return fs.existsSync(pattern);
  }

  async configureRules(analysis) {
    console.log(this.colorize('\\n⚙️  Configuring Automation Rules...', 'bright'));
    
    const ruleTemplates = this.getRuleTemplates(analysis);
    
    console.log(`\\nBased on your repository analysis, we recommend these automation rules:\\n`);
    
    for (const template of ruleTemplates) {
      console.log(`${this.colorize('📋 ' + template.name, 'cyan')}`);
      console.log(`   ${template.description}`);
      console.log(`   ${this.colorize('Risk Level: ' + template.riskLevel, template.riskLevel === 'Low' ? 'green' : 'yellow')}`);
      
      const shouldAdd = await this.askYesNo('   Add this rule?');
      if (shouldAdd) {
        this.config.rules.push(template.rule);
        console.log(`   ${this.colorize('✓ Rule added!', 'green')}`);
      }
      console.log();
    }

    // Custom rule option
    const addCustomRule = await this.askYesNo('Would you like to add any custom rules?');
    if (addCustomRule) {
      await this.addCustomRule();
    }
  }

  getRuleTemplates(analysis) {
    const templates = [];
    
    // Documentation rule (always recommended)
    templates.push({
      name: 'Auto-merge Documentation Updates',
      description: 'Automatically merge changes to .md files, docs/ directory, and README updates',
      riskLevel: 'Low',
      rule: {
        name: 'Documentation auto-merge',
        enabled: true,
        conditions: {
          filePatterns: ['*.md', 'docs/**', 'README*'],
          maxRiskScore: 0.2,
          requiresApproval: false
        },
        actions: {
          autoApprove: true,
          autoMerge: true,
          mergeMethod: 'squash'
        }
      }
    });

    // Configuration files rule
    templates.push({
      name: 'Safe Configuration Changes',
      description: 'Auto-merge low-risk configuration file changes (.yml, .json, .toml)',
      riskLevel: 'Low',
      rule: {
        name: 'Configuration auto-merge',
        enabled: true,
        conditions: {
          filePatterns: ['*.yml', '*.yaml', '*.json', '*.toml', '.gitignore'],
          maxRiskScore: 0.3,
          maxFilesChanged: 5
        },
        actions: {
          autoApprove: true,
          autoMerge: true,
          mergeMethod: 'squash'
        }
      }
    });

    // Test files rule
    if (analysis.hasTests) {
      templates.push({
        name: 'Test File Updates',
        description: 'Auto-merge changes that only affect test files',
        riskLevel: 'Low',
        rule: {
          name: 'Test files auto-merge',
          enabled: true,
          conditions: {
            filePatterns: ['test/**', '__tests__/**', '*.test.*', '*.spec.*'],
            maxRiskScore: 0.4,
            onlyTestFiles: true
          },
          actions: {
            autoApprove: true,
            autoMerge: true,
            mergeMethod: 'squash'
          }
        }
      });
    }

    // Package dependency updates
    if (analysis.packageFiles.length > 0) {
      templates.push({
        name: 'Dependency Updates',
        description: 'Auto-merge minor and patch dependency updates',
        riskLevel: 'Medium',
        rule: {
          name: 'Dependency auto-merge',
          enabled: true,
          conditions: {
            filePatterns: analysis.packageFiles,
            maxRiskScore: 0.5,
            dependencyUpdateType: ['patch', 'minor']
          },
          actions: {
            autoApprove: true,
            autoMerge: true,
            mergeMethod: 'squash',
            requireChecks: true
          }
        }
      });
    }

    return templates;
  }

  async addCustomRule() {
    console.log(this.colorize('\\n🛠️  Creating Custom Rule...', 'bright'));
    
    const ruleName = await this.ask('Rule name: ');
    const description = await this.ask('Description: ');
    
    console.log('\\nFile patterns (one per line, empty line to finish):');
    const filePatterns = [];
    let pattern;
    do {
      pattern = await this.ask('Pattern: ');
      if (pattern) {
        filePatterns.push(pattern);
      }
    } while (pattern);
    
    const maxRiskScore = parseFloat(await this.ask('Maximum risk score (0.0-1.0): ')) || 0.5;
    
    const autoApprove = await this.askYesNo('Auto-approve matching PRs?');
    const autoMerge = await this.askYesNo('Auto-merge matching PRs?');
    
    const rule = {
      name: ruleName,
      description,
      enabled: true,
      conditions: {
        filePatterns,
        maxRiskScore
      },
      actions: {
        autoApprove,
        autoMerge,
        mergeMethod: 'squash'
      }
    };
    
    this.config.rules.push(rule);
    console.log(this.colorize('✓ Custom rule added!', 'green'));
  }

  async configureNotifications() {
    console.log(this.colorize('\\n🔔 Configuring Notifications...', 'bright'));
    
    const wantSlack = await this.askYesNo('Would you like to set up Slack notifications?');
    if (wantSlack) {
      const webhookUrl = await this.ask('Slack webhook URL: ');
      const channel = await this.ask('Slack channel (e.g., #deployments): ');
      
      this.config.notifications.slack = {
        webhookUrl,
        channels: [channel],
        events: ['auto_merged', 'high_risk_pr', 'rule_triggered']
      };
    }
    
    const wantEmail = await this.askYesNo('Would you like to set up email notifications?');
    if (wantEmail) {
      const email = await this.ask('Email address: ');
      
      this.config.notifications.email = {
        to: email,
        events: ['high_risk_pr', 'automation_error']
      };
    }
  }

  async configureSettings() {
    console.log(this.colorize('\\n⚙️  Configuring General Settings...', 'bright'));
    
    const enableAI = await this.askYesNo('Enable AI-powered risk analysis? (Recommended)');
    const riskThreshold = parseFloat(await this.ask('Global risk threshold (0.0-1.0, default 0.5): ')) || 0.5;
    const autoDeleteBranches = await this.askYesNo('Auto-delete branches after merge?');
    
    this.config.settings = {
      aiAnalysis: enableAI,
      riskThreshold,
      autoDeleteBranches,
      requireStatusChecks: true
    };
  }

  async saveConfiguration() {
    const configPath = '.automerge-pro.yml';
    const yaml = this.configToYaml(this.config);
    
    fs.writeFileSync(configPath, yaml);
    
    console.log(this.colorize(`\\n💾 Configuration saved to ${configPath}`, 'green'));
    
    // Create backup
    const backupPath = `.automerge-pro.yml.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, yaml);
    console.log(this.colorize(`📋 Backup created: ${backupPath}`, 'cyan'));
  }

  configToYaml(config) {
    // Simple YAML generation (in production, use a proper YAML library)
    let yaml = `version: '${config.version}'\\n\\n`;
    
    yaml += 'rules:\\n';
    config.rules.forEach(rule => {
      yaml += `  - name: "${rule.name}"\\n`;
      yaml += `    enabled: ${rule.enabled}\\n`;
      yaml += `    conditions:\\n`;
      yaml += `      filePatterns: [${rule.conditions.filePatterns.map(p => `"${p}"`).join(', ')}]\\n`;
      yaml += `      maxRiskScore: ${rule.conditions.maxRiskScore}\\n`;
      if (rule.conditions.maxFilesChanged) {
        yaml += `      maxFilesChanged: ${rule.conditions.maxFilesChanged}\\n`;
      }
      yaml += `    actions:\\n`;
      yaml += `      autoApprove: ${rule.actions.autoApprove}\\n`;
      yaml += `      autoMerge: ${rule.actions.autoMerge}\\n`;
      yaml += `      mergeMethod: "${rule.actions.mergeMethod}"\\n`;
      yaml += `\\n`;
    });
    
    if (Object.keys(config.notifications).length > 0) {
      yaml += 'notifications:\\n';
      
      if (config.notifications.slack) {
        yaml += `  slack:\\n`;
        yaml += `    webhookUrl: "${config.notifications.slack.webhookUrl}"\\n`;
        yaml += `    channels: [${config.notifications.slack.channels.map(c => `"${c}"`).join(', ')}]\\n`;
        yaml += `    events: [${config.notifications.slack.events.map(e => `"${e}"`).join(', ')}]\\n`;
      }
      
      if (config.notifications.email) {
        yaml += `  email:\\n`;
        yaml += `    to: "${config.notifications.email.to}"\\n`;
        yaml += `    events: [${config.notifications.email.events.map(e => `"${e}"`).join(', ')}]\\n`;
      }
      
      yaml += `\\n`;
    }
    
    yaml += 'settings:\\n';
    Object.entries(config.settings).forEach(([key, value]) => {
      yaml += `  ${key}: ${typeof value === 'string' ? `"${value}"` : value}\\n`;
    });
    
    return yaml;
  }

  async testConfiguration() {
    console.log(this.colorize('\\n🧪 Testing Configuration...', 'bright'));
    
    // Validate configuration
    const errors = this.validateConfiguration();
    
    if (errors.length > 0) {
      console.log(this.colorize('❌ Configuration validation failed:', 'red'));
      errors.forEach(error => console.log(`  • ${error}`));
      return false;
    }
    
    console.log(this.colorize('✅ Configuration validation passed!', 'green'));
    
    // Test rule logic
    console.log('\\n📋 Testing rules against sample scenarios...');
    
    const testScenarios = [
      {
        name: 'Documentation update',
        files: ['README.md'],
        description: 'Single README.md change'
      },
      {
        name: 'Multiple config files',
        files: ['package.json', '.gitignore', 'tsconfig.json'],
        description: 'Configuration file updates'
      },
      {
        name: 'Test file changes',
        files: ['test/unit.test.js', '__tests__/integration.test.js'],
        description: 'Test file modifications'
      }
    ];
    
    for (const scenario of testScenarios) {
      const matchingRules = this.findMatchingRules(scenario.files);
      console.log(`  📝 ${scenario.name}: ${this.colorize(matchingRules.length + ' rules match', matchingRules.length > 0 ? 'green' : 'yellow')}`);
    }
    
    return true;
  }

  validateConfiguration() {
    const errors = [];
    
    if (this.config.rules.length === 0) {
      errors.push('No rules configured');
    }
    
    this.config.rules.forEach((rule, index) => {
      if (!rule.name) {
        errors.push(`Rule ${index + 1}: Missing name`);
      }
      
      if (!rule.conditions.filePatterns || rule.conditions.filePatterns.length === 0) {
        errors.push(`Rule ${index + 1}: No file patterns specified`);
      }
      
      if (rule.conditions.maxRiskScore < 0 || rule.conditions.maxRiskScore > 1) {
        errors.push(`Rule ${index + 1}: Invalid risk score (must be 0.0-1.0)`);
      }
    });
    
    if (this.config.settings.riskThreshold < 0 || this.config.settings.riskThreshold > 1) {
      errors.push('Invalid global risk threshold (must be 0.0-1.0)');
    }
    
    return errors;
  }

  findMatchingRules(files) {
    return this.config.rules.filter(rule => {
      return rule.conditions.filePatterns.some(pattern => {
        return files.some(file => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\\*/g, '.*'));
            return regex.test(file);
          }
          return file.includes(pattern.replace('/', ''));
        });
      });
    });
  }

  displaySummary() {
    console.log(this.colorize('\\n📊 Setup Summary', 'bright'));
    console.log('═'.repeat(50));
    
    console.log(`\\n${this.colorize('Rules Configured:', 'cyan')} ${this.config.rules.length}`);
    this.config.rules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.name} (${rule.enabled ? 'Enabled' : 'Disabled'})`);
    });
    
    console.log(`\\n${this.colorize('Notifications:', 'cyan')}`);
    if (this.config.notifications.slack) {
      console.log(`  ✓ Slack (${this.config.notifications.slack.channels.join(', ')})`);
    }
    if (this.config.notifications.email) {
      console.log(`  ✓ Email (${this.config.notifications.email.to})`);
    }
    if (!this.config.notifications.slack && !this.config.notifications.email) {
      console.log('  • None configured');
    }
    
    console.log(`\\n${this.colorize('Settings:', 'cyan')}`);
    console.log(`  • AI Analysis: ${this.config.settings.aiAnalysis ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Risk Threshold: ${this.config.settings.riskThreshold}`);
    console.log(`  • Auto-delete Branches: ${this.config.settings.autoDeleteBranches ? 'Yes' : 'No'}`);
  }

  async displayNextSteps() {
    console.log(this.colorize('\\n🎯 Next Steps', 'bright'));
    console.log('═'.repeat(50));
    
    console.log(`
${this.colorize('1. Install the GitHub App', 'cyan')}
   Visit: https://github.com/marketplace/automerge-pro
   Install on your repositories

${this.colorize('2. Commit your configuration', 'cyan')}
   git add .automerge-pro.yml
   git commit -m "Add AutoMerge Pro configuration"
   git push

${this.colorize('3. Test with a sample PR', 'cyan')}
   Create a documentation update PR to test automation

${this.colorize('4. Monitor and adjust', 'cyan')}
   Check the AutoMerge Pro dashboard for analytics
   Adjust rules based on your team's workflow

${this.colorize('5. Get support', 'cyan')}
   Documentation: https://docs.automerge-pro.com
   Support: support@automerge-pro.com
   Community: https://discord.gg/automerge-pro
    `);
    
    const openDashboard = await this.askYesNo('Would you like to open the dashboard now?');
    if (openDashboard) {
      console.log('Opening dashboard...');
      // In a real implementation, open the browser
      console.log(this.colorize('Dashboard: https://app.automerge-pro.com/dashboard', 'blue'));
    }
  }

  async run() {
    try {
      this.displayWelcome();
      
      const proceed = await this.askYesNo('Ready to get started?');
      if (!proceed) {
        console.log('Setup cancelled. Run again when you\\'re ready!');
        return;
      }
      
      await this.checkPrerequisites();
      const analysis = await this.analyzeRepository();
      await this.configureRules(analysis);
      await this.configureNotifications();
      await this.configureSettings();
      
      await this.saveConfiguration();
      
      const testPassed = await this.testConfiguration();
      if (!testPassed) {
        const continueAnyway = await this.askYesNo('Configuration has issues. Continue anyway?');
        if (!continueAnyway) {
          console.log('Please fix the configuration issues and run the wizard again.');
          return;
        }
      }
      
      this.displaySummary();
      await this.displayNextSteps();
      
      console.log(this.colorize('\\n🎉 Setup complete! Welcome to AutoMerge Pro!', 'green'));
      
    } catch (error) {
      console.error(this.colorize(`\\n❌ Setup failed: ${error.message}`, 'red'));
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run the wizard
if (require.main === module) {
  const wizard = new OnboardingWizard();
  wizard.run().catch(console.error);
}

module.exports = OnboardingWizard;