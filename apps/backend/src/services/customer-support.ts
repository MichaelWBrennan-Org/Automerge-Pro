import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notification';

interface SupportTicket {
  id: string;
  type: 'bug' | 'feature_request' | 'question' | 'billing' | 'technical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  customerEmail: string;
  customerName?: string;
  organizationId?: string;
  assignedTo?: string;
  tags: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  customerEmail: string;
  organizationId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'under_review' | 'planned' | 'in_development' | 'released' | 'rejected';
  upvotes: number;
  tags: string[];
  businessImpact?: string;
  useCase?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AutoResponse {
  trigger: string;
  condition: (ticket: SupportTicket) => boolean;
  response: string;
  action?: 'close' | 'assign' | 'tag' | 'escalate';
}

export class CustomerSupportService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private autoResponses: AutoResponse[];

  constructor(prisma: PrismaClient, notificationService: NotificationService) {
    this.prisma = prisma;
    this.notificationService = notificationService;
    this.autoResponses = this.setupAutoResponses();
  }

  private setupAutoResponses(): AutoResponse[] {
    return [
      {
        trigger: 'billing_question',
        condition: (ticket) => 
          ticket.type === 'billing' || 
          ticket.description.toLowerCase().includes('billing') ||
          ticket.description.toLowerCase().includes('payment') ||
          ticket.description.toLowerCase().includes('subscription'),
        response: `Thank you for contacting us about billing. Here are some quick answers to common billing questions:

• **Plan Changes**: You can upgrade or downgrade your plan anytime from your dashboard
• **Billing Cycle**: Charges occur on the same date each month/year as your initial subscription
• **Invoices**: Available in your dashboard under Billing → Invoice History
• **Payment Issues**: Check that your payment method is valid and has sufficient funds

If this doesn't resolve your issue, we'll have a billing specialist review your account and respond within 4 hours.

Best regards,
AutoMerge Pro Support Team`,
        action: 'assign'
      },
      {
        trigger: 'setup_help',
        condition: (ticket) =>
          ticket.description.toLowerCase().includes('setup') ||
          ticket.description.toLowerCase().includes('install') ||
          ticket.description.toLowerCase().includes('configure'),
        response: `Thanks for reaching out! Setting up AutoMerge Pro is usually very quick. Here's our step-by-step guide:

**Quick Setup (2 minutes):**
1. Install our GitHub App: https://github.com/apps/automerge-pro
2. Select the repositories you want to automate
3. The app will start working immediately with smart defaults

**Customization:**
• Visit your dashboard to create custom rules
• Check our setup guide: https://docs.automerge-pro.com/setup
• Watch our 3-minute setup video: https://youtube.com/watch?v=setup-demo

If you're still having trouble, we'll have a technical specialist help you personally within 2 hours.

Best regards,
AutoMerge Pro Support Team`,
        action: 'assign'
      },
      {
        trigger: 'feature_request',
        condition: (ticket) =>
          ticket.type === 'feature_request' ||
          ticket.description.toLowerCase().includes('feature request') ||
          ticket.description.toLowerCase().includes('enhancement') ||
          ticket.description.toLowerCase().includes('suggestion'),
        response: `Thank you for your feature suggestion! We really value customer feedback and many of our best features come from user suggestions.

Your request has been added to our feature roadmap for review. Here's what happens next:

1. **Review**: Our product team reviews all requests within 1 week
2. **Prioritization**: Features are prioritized based on customer impact and technical feasibility
3. **Updates**: You'll receive email updates when the status changes
4. **Beta Access**: If implemented, you'll get early access to test the feature

You can track the status of your request in your dashboard under "Feature Requests".

Is there anything else we can help you with today?

Best regards,
AutoMerge Pro Product Team`,
        action: 'tag'
      }
    ];
  }

  /**
   * Create a new support ticket with automatic classification and routing
   */
  async createSupportTicket(data: {
    subject: string;
    description: string;
    customerEmail: string;
    customerName?: string;
    organizationId?: string;
    type?: string;
    metadata?: any;
  }): Promise<SupportTicket> {
    try {
      // Auto-classify ticket type and priority using keywords
      const classification = this.classifyTicket(data.subject, data.description);
      
      const ticket = await this.prisma.supportTicket.create({
        data: {
          id: this.generateTicketId(),
          type: data.type || classification.type,
          priority: classification.priority,
          status: 'open',
          subject: data.subject,
          description: data.description,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          organizationId: data.organizationId,
          tags: classification.tags,
          metadata: data.metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Check for auto-responses
      await this.processAutoResponses(ticket);

      // Notify support team
      await this.notifySupport(ticket);

      // Send confirmation to customer
      await this.sendCustomerConfirmation(ticket);

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  /**
   * Create a feature request with automatic analysis
   */
  async createFeatureRequest(data: {
    title: string;
    description: string;
    customerEmail: string;
    organizationId?: string;
    businessImpact?: string;
    useCase?: string;
  }): Promise<FeatureRequest> {
    try {
      // Analyze feature request for similar existing requests
      const similarRequests = await this.findSimilarFeatureRequests(data.title, data.description);
      
      const featureRequest = await this.prisma.featureRequest.create({
        data: {
          id: this.generateId(),
          title: data.title,
          description: data.description,
          customerEmail: data.customerEmail,
          organizationId: data.organizationId,
          priority: this.calculateFeaturePriority(data),
          status: 'submitted',
          upvotes: 1,
          tags: this.extractFeatureTags(data.description),
          businessImpact: data.businessImpact,
          useCase: data.useCase,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // If similar requests exist, suggest consolidation
      if (similarRequests.length > 0) {
        await this.suggestFeatureConsolidation(featureRequest, similarRequests);
      }

      // Notify product team
      await this.notifyProductTeam(featureRequest);

      return featureRequest;
    } catch (error) {
      console.error('Error creating feature request:', error);
      throw new Error('Failed to create feature request');
    }
  }

  /**
   * Process automatic responses based on ticket content
   */
  private async processAutoResponses(ticket: SupportTicket): Promise<void> {
    for (const autoResponse of this.autoResponses) {
      if (autoResponse.condition(ticket)) {
        // Send auto-response
        await this.sendAutoResponse(ticket, autoResponse.response);

        // Perform action if specified
        if (autoResponse.action) {
          await this.performTicketAction(ticket, autoResponse.action);
        }

        // Only apply first matching auto-response
        break;
      }
    }
  }

  /**
   * Classify ticket type and priority based on content analysis
   */
  private classifyTicket(subject: string, description: string): {
    type: SupportTicket['type'];
    priority: SupportTicket['priority'];
    tags: string[];
  } {
    const content = `${subject} ${description}`.toLowerCase();
    const tags: string[] = [];

    // Classify type
    let type: SupportTicket['type'] = 'question';
    if (content.includes('bug') || content.includes('error') || content.includes('broken')) {
      type = 'bug';
      tags.push('bug');
    } else if (content.includes('feature') || content.includes('enhancement') || content.includes('suggestion')) {
      type = 'feature_request';
      tags.push('feature_request');
    } else if (content.includes('billing') || content.includes('payment') || content.includes('subscription')) {
      type = 'billing';
      tags.push('billing');
    } else if (content.includes('setup') || content.includes('install') || content.includes('configure')) {
      type = 'technical';
      tags.push('setup');
    }

    // Classify priority
    let priority: SupportTicket['priority'] = 'medium';
    if (content.includes('urgent') || content.includes('critical') || content.includes('down')) {
      priority = 'urgent';
    } else if (content.includes('important') || content.includes('asap') || content.includes('production')) {
      priority = 'high';
    } else if (content.includes('question') || content.includes('minor')) {
      priority = 'low';
    }

    // Add context tags
    if (content.includes('ai') || content.includes('analysis')) tags.push('ai');
    if (content.includes('integration')) tags.push('integration');
    if (content.includes('security')) tags.push('security');
    if (content.includes('performance')) tags.push('performance');

    return { type, priority, tags };
  }

  /**
   * Find similar feature requests to avoid duplicates
   */
  private async findSimilarFeatureRequests(title: string, description: string): Promise<FeatureRequest[]> {
    // Simple similarity check - in production, you'd use more sophisticated NLP
    const keywords = this.extractKeywords(title + ' ' + description);
    
    const similarRequests = await this.prisma.featureRequest.findMany({
      where: {
        OR: keywords.map(keyword => ({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        })),
        status: { in: ['submitted', 'under_review', 'planned', 'in_development'] }
      },
      take: 5
    });

    return similarRequests;
  }

  /**
   * Calculate feature priority based on business impact and customer tier
   */
  private calculateFeaturePriority(data: {
    businessImpact?: string;
    organizationId?: string;
  }): FeatureRequest['priority'] {
    let priority: FeatureRequest['priority'] = 'medium';

    // Check business impact keywords
    if (data.businessImpact) {
      const impact = data.businessImpact.toLowerCase();
      if (impact.includes('critical') || impact.includes('blocking') || impact.includes('revenue')) {
        priority = 'high';
      } else if (impact.includes('nice to have') || impact.includes('minor')) {
        priority = 'low';
      }
    }

    // In a real implementation, you'd check the customer's plan/tier
    // Enterprise customers might get higher priority

    return priority;
  }

  /**
   * Extract relevant tags from feature description
   */
  private extractFeatureTags(description: string): string[] {
    const content = description.toLowerCase();
    const tags: string[] = [];

    // Feature area tags
    if (content.includes('ai') || content.includes('analysis')) tags.push('ai');
    if (content.includes('ui') || content.includes('dashboard') || content.includes('interface')) tags.push('ui');
    if (content.includes('api') || content.includes('webhook') || content.includes('integration')) tags.push('api');
    if (content.includes('notification') || content.includes('alert')) tags.push('notifications');
    if (content.includes('security') || content.includes('permission')) tags.push('security');
    if (content.includes('performance') || content.includes('speed')) tags.push('performance');
    if (content.includes('rule') || content.includes('automation')) tags.push('automation');

    return tags;
  }

  /**
   * Send automatic response to customer
   */
  private async sendAutoResponse(ticket: SupportTicket, response: string): Promise<void> {
    try {
      await this.notificationService.sendEmail({
        to: ticket.customerEmail,
        subject: `Re: ${ticket.subject} [Ticket #${ticket.id}]`,
        html: `
          <p>Hi${ticket.customerName ? ` ${ticket.customerName}` : ''},</p>
          
          ${response.split('\n').map(line => `<p>${line}</p>`).join('')}
          
          <hr>
          <p><small>
            Ticket ID: ${ticket.id}<br>
            Need more help? Simply reply to this email.
          </small></p>
        `
      });

      // Log the auto-response
      await this.prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          type: 'auto_response',
          description: 'Automatic response sent',
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error sending auto-response:', error);
    }
  }

  /**
   * Perform automated actions on tickets
   */
  private async performTicketAction(ticket: SupportTicket, action: string): Promise<void> {
    switch (action) {
      case 'assign':
        // Auto-assign to appropriate team member based on type
        const assignee = this.getAutoAssignee(ticket.type);
        if (assignee) {
          await this.prisma.supportTicket.update({
            where: { id: ticket.id },
            data: { assignedTo: assignee }
          });
        }
        break;

      case 'tag':
        // Additional tags have already been set during classification
        break;

      case 'escalate':
        await this.prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { priority: 'high' }
        });
        break;
    }
  }

  /**
   * Get appropriate assignee based on ticket type
   */
  private getAutoAssignee(type: SupportTicket['type']): string | null {
    const assignments = {
      'billing': 'billing-team@automerge-pro.com',
      'technical': 'tech-support@automerge-pro.com',
      'feature_request': 'product-team@automerge-pro.com',
      'bug': 'engineering@automerge-pro.com',
      'question': 'support@automerge-pro.com'
    };

    return assignments[type] || null;
  }

  /**
   * Extract keywords for similarity matching
   */
  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Generate unique ticket ID
   */
  private generateTicketId(): string {
    return `AMP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify support team about new ticket
   */
  private async notifySupport(ticket: SupportTicket): Promise<void> {
    // In production, this would notify via Slack, email, or ticketing system
    console.log(`New support ticket: ${ticket.id} - ${ticket.subject} (${ticket.priority})`);
  }

  /**
   * Send confirmation to customer
   */
  private async sendCustomerConfirmation(ticket: SupportTicket): Promise<void> {
    const priorityEmoji = {
      urgent: '🚨',
      high: '⚡',
      medium: '📧',
      low: '📝'
    };

    try {
      await this.notificationService.sendEmail({
        to: ticket.customerEmail,
        subject: `Support Request Received [Ticket #${ticket.id}]`,
        html: `
          <h2>We've received your support request</h2>
          
          <p>Hi${ticket.customerName ? ` ${ticket.customerName}` : ''},</p>
          
          <p>Thank you for contacting AutoMerge Pro support. We've received your request and our team will get back to you soon.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Ticket Details</h3>
            <p><strong>Ticket ID:</strong> ${ticket.id}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p><strong>Priority:</strong> ${priorityEmoji[ticket.priority]} ${ticket.priority.toUpperCase()}</p>
            <p><strong>Type:</strong> ${ticket.type.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <p><strong>Expected Response Time:</strong></p>
          <ul>
            <li>Urgent: Within 1 hour</li>
            <li>High: Within 4 hours</li>
            <li>Medium: Within 24 hours</li>
            <li>Low: Within 48 hours</li>
          </ul>
          
          <p>You can track the status of your request by replying to this email or visiting your <a href="https://automerge-pro.com/support">support dashboard</a>.</p>
          
          <p>Best regards,<br>The AutoMerge Pro Support Team</p>
        `
      });
    } catch (error) {
      console.error('Error sending customer confirmation:', error);
    }
  }

  /**
   * Notify product team about feature request
   */
  private async notifyProductTeam(request: FeatureRequest): Promise<void> {
    console.log(`New feature request: ${request.id} - ${request.title} (${request.priority})`);
  }

  /**
   * Suggest consolidation of similar feature requests
   */
  private async suggestFeatureConsolidation(
    newRequest: FeatureRequest, 
    similarRequests: FeatureRequest[]
  ): Promise<void> {
    // In production, this would notify the product team about potential duplicates
    console.log(`Similar feature requests found for ${newRequest.id}:`, similarRequests.map(r => r.id));
  }

  /**
   * Get support analytics and metrics
   */
  async getSupportMetrics(timeframe: 'day' | 'week' | 'month' = 'week') {
    const since = new Date();
    switch (timeframe) {
      case 'day':
        since.setDate(since.getDate() - 1);
        break;
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
      case 'month':
        since.setMonth(since.getMonth() - 1);
        break;
    }

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      avgResponseTime,
      ticketsByType,
      ticketsByPriority
    ] = await Promise.all([
      this.prisma.supportTicket.count({
        where: { createdAt: { gte: since } }
      }),
      this.prisma.supportTicket.count({
        where: { 
          createdAt: { gte: since },
          status: { in: ['open', 'in_progress'] }
        }
      }),
      this.prisma.supportTicket.count({
        where: {
          createdAt: { gte: since },
          status: 'resolved'
        }
      }),
      // Calculate average response time (simplified)
      this.calculateAverageResponseTime(since),
      this.prisma.supportTicket.groupBy({
        by: ['type'],
        where: { createdAt: { gte: since } },
        _count: true
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: since } },
        _count: true
      })
    ]);

    return {
      timeframe,
      totalTickets,
      openTickets,
      resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      avgResponseTime,
      ticketsByType,
      ticketsByPriority
    };
  }

  private async calculateAverageResponseTime(since: Date): Promise<number> {
    // Simplified calculation - in production you'd track actual response times
    return 4.2; // Average 4.2 hours
  }
}

export default CustomerSupportService;