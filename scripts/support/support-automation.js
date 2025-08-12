#!/usr/bin/env node

/**
 * Support Automation System
 * Manages feedback collection, ticket creation, and support analytics
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SupportSystem {
  constructor() {
    this.supportTickets = [];
    this.feedback = [];
    this.analytics = {
      totalTickets: 0,
      resolvedTickets: 0,
      averageResolutionTime: 0,
      customerSatisfaction: 0
    };
  }

  /**
   * Submit feedback from users
   */
  async submitFeedback(feedbackData) {
    const feedback = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: feedbackData.type || 'general',
      category: feedbackData.category || 'feature_request',
      priority: this.calculatePriority(feedbackData),
      user: {
        id: feedbackData.userId,
        email: feedbackData.email,
        organization: feedbackData.organization,
        plan: feedbackData.plan || 'free'
      },
      content: {
        title: feedbackData.title,
        description: feedbackData.description,
        steps: feedbackData.steps || [],
        expectedBehavior: feedbackData.expectedBehavior,
        actualBehavior: feedbackData.actualBehavior,
        browserInfo: feedbackData.browserInfo,
        systemInfo: feedbackData.systemInfo
      },
      metadata: {
        source: feedbackData.source || 'dashboard',
        userAgent: feedbackData.userAgent,
        referrer: feedbackData.referrer,
        sessionId: feedbackData.sessionId
      },
      status: 'new',
      assignee: null,
      tags: this.generateTags(feedbackData),
      sentiment: await this.analyzeSentiment(feedbackData.description)
    };

    this.feedback.push(feedback);
    
    // Auto-create ticket for bugs and urgent issues
    if (feedback.category === 'bug_report' || feedback.priority === 'high') {
      await this.createTicket(feedback);
    }
    
    // Send acknowledgment
    await this.sendAcknowledgment(feedback);
    
    return feedback;
  }

  /**
   * Create support ticket
   */
  async createTicket(feedbackOrData) {
    const ticket = {
      id: this.generateId(),
      ticketNumber: this.generateTicketNumber(),
      timestamp: new Date().toISOString(),
      source: feedbackOrData.id ? 'feedback' : 'direct',
      feedbackId: feedbackOrData.id || null,
      status: 'open',
      priority: feedbackOrData.priority || 'medium',
      category: feedbackOrData.category || 'support',
      user: feedbackOrData.user || {
        id: feedbackOrData.userId,
        email: feedbackOrData.email,
        organization: feedbackOrData.organization,
        plan: feedbackOrData.plan || 'free'
      },
      subject: feedbackOrData.content?.title || feedbackOrData.subject,
      description: feedbackOrData.content?.description || feedbackOrData.description,
      assignee: this.assignTicket(feedbackOrData),
      tags: feedbackOrData.tags || this.generateTags(feedbackOrData),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          user: 'system',
          details: 'Ticket created automatically'
        }
      ],
      sla: this.calculateSLA(feedbackOrData),
      dueDate: this.calculateDueDate(feedbackOrData)
    };

    this.supportTickets.push(ticket);
    
    // Integrate with external systems
    await this.integrateWithZendesk(ticket);
    await this.integrateWithGitHub(ticket);
    await this.notifyTeam(ticket);
    
    return ticket;
  }

  /**
   * Generate weekly feedback summary
   */
  async generateWeeklyReport() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyFeedback = this.feedback.filter(
      f => new Date(f.timestamp) >= oneWeekAgo
    );
    
    const weeklyTickets = this.supportTickets.filter(
      t => new Date(t.timestamp) >= oneWeekAgo
    );

    const report = {
      period: {
        start: oneWeekAgo.toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        totalFeedback: weeklyFeedback.length,
        totalTickets: weeklyTickets.length,
        newBugs: weeklyFeedback.filter(f => f.category === 'bug_report').length,
        featureRequests: weeklyFeedback.filter(f => f.category === 'feature_request').length,
        positiveReviews: weeklyFeedback.filter(f => f.sentiment === 'positive').length,
        negativeReviews: weeklyFeedback.filter(f => f.sentiment === 'negative').length
      },
      trends: {
        feedbackGrowth: this.calculateFeedbackGrowth(),
        resolutionTimeImprovement: this.calculateResolutionTimeImprovement(),
        customerSatisfactionTrend: this.calculateSatisfactionTrend()
      },
      topIssues: this.identifyTopIssues(weeklyFeedback),
      customerInsights: this.generateCustomerInsights(weeklyFeedback),
      actionItems: this.generateActionItems(weeklyFeedback, weeklyTickets),
      metrics: {
        averageResponseTime: this.calculateAverageResponseTime(weeklyTickets),
        resolutionRate: this.calculateResolutionRate(weeklyTickets),
        customerSatisfaction: this.calculateCustomerSatisfaction(weeklyFeedback),
        escalationRate: this.calculateEscalationRate(weeklyTickets)
      }
    };

    // Generate release notes draft
    const releaseNotes = this.generateReleaseNotesDraft(weeklyFeedback);
    
    // Save reports
    const timestamp = new Date().toISOString().split('T')[0];
    fs.writeFileSync(`reports/weekly-feedback-${timestamp}.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`reports/release-notes-draft-${timestamp}.md`, releaseNotes);

    return report;
  }

  /**
   * Support Dashboard KPIs
   */
  generateDashboardKPIs() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentTickets = this.supportTickets.filter(
      t => new Date(t.timestamp) >= thirtyDaysAgo
    );
    
    const recentFeedback = this.feedback.filter(
      f => new Date(f.timestamp) >= thirtyDaysAgo
    );

    return {
      overview: {
        openTickets: this.supportTickets.filter(t => t.status === 'open').length,
        ticketsThisMonth: recentTickets.length,
        averageResolutionTime: this.calculateAverageResolutionTime(recentTickets),
        customerSatisfaction: this.calculateCustomerSatisfaction(recentFeedback)
      },
      performance: {
        firstResponseTime: this.calculateFirstResponseTime(recentTickets),
        resolutionRate: this.calculateResolutionRate(recentTickets),
        escalationRate: this.calculateEscalationRate(recentTickets),
        slaCompliance: this.calculateSLACompliance(recentTickets)
      },
      insights: {
        topCategories: this.getTopCategories(recentFeedback),
        sentimentDistribution: this.getSentimentDistribution(recentFeedback),
        userPlanDistribution: this.getUserPlanDistribution(recentFeedback),
        channelDistribution: this.getChannelDistribution(recentFeedback)
      },
      trends: {
        ticketVolumeTrend: this.getTicketVolumeTrend(),
        resolutionTimeTrend: this.getResolutionTimeTrend(),
        satisfactionTrend: this.getSatisfactionTrend(),
        categoryTrends: this.getCategoryTrends()
      }
    };
  }

  // Helper methods for calculations and integrations

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateTicketNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AMP-${timestamp}-${random}`;
  }

  calculatePriority(feedbackData) {
    let score = 0;
    
    // Category weight
    const categoryWeights = {
      'bug_report': 3,
      'security_issue': 4,
      'performance_issue': 2,
      'feature_request': 1,
      'general': 1
    };
    score += categoryWeights[feedbackData.category] || 1;
    
    // User plan weight
    const planWeights = {
      'enterprise': 3,
      'growth': 2,
      'team': 2,
      'free': 1
    };
    score += planWeights[feedbackData.plan] || 1;
    
    // Severity keywords
    const severityKeywords = {
      'critical': 4,
      'urgent': 3,
      'broken': 3,
      'error': 2,
      'slow': 2,
      'improvement': 1
    };
    
    const description = (feedbackData.description || '').toLowerCase();
    for (const [keyword, weight] of Object.entries(severityKeywords)) {
      if (description.includes(keyword)) {
        score += weight;
        break;
      }
    }
    
    // Convert score to priority
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  generateTags(data) {
    const tags = [];
    
    // Automatic tags based on content
    const description = (data.description || '').toLowerCase();
    const title = (data.title || '').toLowerCase();
    const content = `${title} ${description}`;
    
    const tagKeywords = {
      'ui': ['interface', 'ui', 'design', 'layout', 'styling'],
      'performance': ['slow', 'performance', 'speed', 'lag', 'timeout'],
      'security': ['security', 'vulnerability', 'auth', 'permission'],
      'integration': ['github', 'api', 'webhook', 'integration'],
      'mobile': ['mobile', 'responsive', 'phone', 'tablet'],
      'documentation': ['docs', 'documentation', 'help', 'guide'],
      'billing': ['billing', 'payment', 'subscription', 'plan'],
      'automation': ['automation', 'rules', 'merge', 'auto'],
      'dashboard': ['dashboard', 'analytics', 'metrics', 'chart']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(tag);
      }
    }

    // Add plan-based tag
    if (data.plan) {
      tags.push(`plan:${data.plan}`);
    }

    // Add source tag
    if (data.source) {
      tags.push(`source:${data.source}`);
    }

    return tags;
  }

  async analyzeSentiment(text) {
    // Simplified sentiment analysis (in production, use ML service)
    const positiveKeywords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'helpful', 'easy'];
    const negativeKeywords = ['terrible', 'awful', 'hate', 'broken', 'useless', 'frustrated', 'bug'];
    
    const lowerText = text.toLowerCase();
    
    const positiveCount = positiveKeywords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeKeywords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  assignTicket(data) {
    // Simple assignment logic (in production, use more sophisticated routing)
    const assignments = {
      'bug_report': 'engineering-team',
      'security_issue': 'security-team',
      'billing': 'billing-team',
      'feature_request': 'product-team',
      'integration': 'engineering-team'
    };
    
    return assignments[data.category] || 'support-team';
  }

  calculateSLA(data) {
    // SLA based on priority and plan
    const slaMatrix = {
      'critical': { 'enterprise': 2, 'growth': 4, 'team': 8, 'free': 24 },
      'high': { 'enterprise': 4, 'growth': 8, 'team': 24, 'free': 72 },
      'medium': { 'enterprise': 8, 'growth': 24, 'team': 72, 'free': 168 },
      'low': { 'enterprise': 24, 'growth': 72, 'team': 168, 'free': 336 }
    };
    
    const priority = data.priority || 'medium';
    const plan = data.plan || 'free';
    
    return slaMatrix[priority][plan] || 168; // hours
  }

  calculateDueDate(data) {
    const slaHours = this.calculateSLA(data);
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + slaHours);
    return dueDate.toISOString();
  }

  async integrateWithZendesk(ticket) {
    // Mock Zendesk integration
    console.log(`Would create Zendesk ticket: ${ticket.ticketNumber}`);
    
    // In production:
    // - Create ticket in Zendesk
    // - Set up bidirectional sync
    // - Map fields appropriately
  }

  async integrateWithGitHub(ticket) {
    if (ticket.category === 'bug_report' || ticket.category === 'feature_request') {
      // Create GitHub issue for bugs and feature requests
      console.log(`Would create GitHub issue for ticket: ${ticket.ticketNumber}`);
      
      // In production:
      // - Create GitHub issue
      // - Link ticket to issue
      // - Set up status sync
    }
  }

  async notifyTeam(ticket) {
    console.log(`Notifying ${ticket.assignee} about new ticket: ${ticket.ticketNumber}`);
    
    // In production:
    // - Send Slack notification
    // - Email assignment
    // - Update dashboard
  }

  async sendAcknowledgment(feedback) {
    console.log(`Sending acknowledgment to ${feedback.user.email}`);
    
    // In production:
    // - Send email acknowledgment
    // - Provide ticket number if created
    // - Include expected response time
  }

  // Analytics and reporting methods

  identifyTopIssues(feedback) {
    const issueMap = new Map();
    
    feedback.forEach(f => {
      f.tags.forEach(tag => {
        if (!tag.startsWith('plan:') && !tag.startsWith('source:')) {
          issueMap.set(tag, (issueMap.get(tag) || 0) + 1);
        }
      });
    });
    
    return Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ issue: tag, count }));
  }

  generateCustomerInsights(feedback) {
    const insights = [];
    
    // Plan-based insights
    const planFeedback = feedback.reduce((acc, f) => {
      const plan = f.user.plan || 'free';
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(f);
      return acc;
    }, {});
    
    Object.entries(planFeedback).forEach(([plan, feedbacks]) => {
      const avgSentiment = feedbacks.reduce((sum, f) => {
        const scores = { positive: 1, neutral: 0, negative: -1 };
        return sum + scores[f.sentiment];
      }, 0) / feedbacks.length;
      
      insights.push({
        category: 'plan_satisfaction',
        plan,
        metric: 'sentiment_score',
        value: avgSentiment,
        count: feedbacks.length
      });
    });
    
    return insights;
  }

  generateActionItems(feedback, tickets) {
    const actionItems = [];
    
    // High-frequency issues
    const topIssues = this.identifyTopIssues(feedback);
    topIssues.slice(0, 3).forEach(issue => {
      if (issue.count >= 3) {
        actionItems.push({
          priority: 'high',
          type: 'product_improvement',
          description: `Address recurring ${issue.issue} issues (${issue.count} reports)`,
          assignee: 'product-team',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    });
    
    // SLA breaches
    const breachedTickets = tickets.filter(t => 
      new Date() > new Date(t.dueDate) && t.status === 'open'
    );
    
    if (breachedTickets.length > 0) {
      actionItems.push({
        priority: 'critical',
        type: 'sla_breach',
        description: `Address ${breachedTickets.length} SLA-breached tickets`,
        assignee: 'support-manager',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return actionItems;
  }

  generateReleaseNotesDraft(feedback) {
    const features = feedback.filter(f => f.category === 'feature_request')
      .slice(0, 5)
      .map(f => `- ${f.content.title}`)
      .join('\\n');
    
    const bugs = feedback.filter(f => f.category === 'bug_report')
      .slice(0, 5)
      .map(f => `- Fixed: ${f.content.title}`)
      .join('\\n');
    
    return `
# Release Notes Draft - ${new Date().toISOString().split('T')[0]}

## 🚀 New Features
${features || '- No feature requests this week'}

## 🐛 Bug Fixes
${bugs || '- No bug reports this week'}

## 📈 Improvements
- Enhanced user experience based on customer feedback
- Performance optimizations
- UI/UX improvements

## 📊 Community Stats
- Total feedback submissions: ${feedback.length}
- Customer satisfaction: ${this.calculateCustomerSatisfaction(feedback).toFixed(1)}%
- Response time: Improved by X%

---
*This draft was automatically generated from user feedback. Please review and edit before publishing.*
    `;
  }

  // Calculation helper methods

  calculateAverageResponseTime(tickets) {
    if (tickets.length === 0) return 0;
    
    const responseTimes = tickets
      .filter(t => t.history.length > 1)
      .map(t => {
        const created = new Date(t.timestamp);
        const firstResponse = new Date(t.history[1].timestamp);
        return (firstResponse - created) / (1000 * 60 * 60); // hours
      });
    
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  calculateResolutionRate(tickets) {
    if (tickets.length === 0) return 0;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    return (resolved / tickets.length) * 100;
  }

  calculateCustomerSatisfaction(feedback) {
    if (feedback.length === 0) return 0;
    
    const sentimentScores = feedback.map(f => {
      const scores = { positive: 100, neutral: 50, negative: 0 };
      return scores[f.sentiment];
    });
    
    return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  }

  calculateEscalationRate(tickets) {
    if (tickets.length === 0) return 0;
    const escalated = tickets.filter(t => t.tags.includes('escalated')).length;
    return (escalated / tickets.length) * 100;
  }

  // Additional helper methods for dashboard KPIs

  calculateFirstResponseTime(tickets) {
    return this.calculateAverageResponseTime(tickets);
  }

  calculateSLACompliance(tickets) {
    if (tickets.length === 0) return 100;
    const onTime = tickets.filter(t => 
      new Date() <= new Date(t.dueDate) || t.status === 'resolved'
    ).length;
    return (onTime / tickets.length) * 100;
  }

  getTopCategories(feedback) {
    const categories = feedback.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  getSentimentDistribution(feedback) {
    return feedback.reduce((acc, f) => {
      acc[f.sentiment] = (acc[f.sentiment] || 0) + 1;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
  }

  getUserPlanDistribution(feedback) {
    return feedback.reduce((acc, f) => {
      const plan = f.user.plan || 'free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});
  }

  getChannelDistribution(feedback) {
    return feedback.reduce((acc, f) => {
      const source = f.metadata.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
  }

  // Trend calculation methods (simplified)
  getTicketVolumeTrend() {
    // In production, calculate actual trend data
    return [45, 52, 48, 61, 55, 67, 59]; // Last 7 days
  }

  getResolutionTimeTrend() {
    return [4.2, 3.8, 4.1, 3.5, 3.9, 3.2, 3.6]; // Hours
  }

  getSatisfactionTrend() {
    return [87, 89, 85, 92, 88, 91, 94]; // Percentage
  }

  getCategoryTrends() {
    return {
      'bug_report': [12, 15, 11, 18, 14, 16, 13],
      'feature_request': [23, 27, 25, 31, 28, 35, 30],
      'general': [10, 8, 12, 9, 11, 14, 12]
    };
  }

  // Growth calculation helpers
  calculateFeedbackGrowth() {
    // Mock calculation - in production, compare with previous period
    return 15; // 15% increase
  }

  calculateResolutionTimeImprovement() {
    return -12; // 12% improvement (negative = better)
  }

  calculateSatisfactionTrend() {
    return 7; // 7% improvement
  }
}

// CLI interface for testing
async function main() {
  const supportSystem = new SupportSystem();
  
  // Demo data
  const sampleFeedback = {
    userId: 'user_123',
    email: 'user@example.com',
    organization: 'TechCorp',
    plan: 'team',
    type: 'bug_report',
    category: 'bug_report',
    title: 'Dashboard loading slowly',
    description: 'The analytics dashboard takes over 10 seconds to load, making it frustrating to use.',
    expectedBehavior: 'Dashboard should load within 2-3 seconds',
    actualBehavior: 'Takes 10+ seconds to load',
    source: 'dashboard',
    userAgent: 'Mozilla/5.0...'
  };
  
  console.log('🎯 Testing Support System...');
  
  // Submit feedback
  const feedback = await supportSystem.submitFeedback(sampleFeedback);
  console.log('✅ Feedback submitted:', feedback.id);
  
  // Generate weekly report
  const report = await supportSystem.generateWeeklyReport();
  console.log('📊 Weekly report generated');
  
  // Generate dashboard KPIs
  const kpis = supportSystem.generateDashboardKPIs();
  console.log('📈 Dashboard KPIs:', JSON.stringify(kpis.overview, null, 2));
  
  console.log('\\n✨ Support System test complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SupportSystem;