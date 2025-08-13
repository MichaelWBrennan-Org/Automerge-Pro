import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CustomerSupportService } from '../services/customer-support';
import { NotificationService } from '../services/notification';

interface CreateTicketRequest {
  Body: {
    subject: string;
    description: string;
    customerEmail: string;
    customerName?: string;
    organizationId?: string;
    type?: 'bug' | 'feature_request' | 'question' | 'billing' | 'technical';
  };
}

interface CreateFeatureRequestBody {
  Body: {
    title: string;
    description: string;
    customerEmail: string;
    organizationId?: string;
    businessImpact?: string;
    useCase?: string;
  };
}

export async function supportRoutes(fastify: FastifyInstance) {
  const notificationService = new NotificationService();
  const supportService = new CustomerSupportService(fastify.prisma, notificationService);

  // Create support ticket
  fastify.post<CreateTicketRequest>('/tickets', async (request, reply) => {
    const { subject, description, customerEmail, customerName, organizationId, type } = request.body;

    try {
      // Basic validation
      if (!subject || !description || !customerEmail) {
        return reply.status(400).send({ 
          error: 'Subject, description, and customer email are required' 
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return reply.status(400).send({ 
          error: 'Valid email address is required' 
        });
      }

      const ticket = await supportService.createSupportTicket({
        subject,
        description,
        customerEmail,
        customerName,
        organizationId,
        type
      });

      return reply.send({
        ticketId: ticket.id,
        status: ticket.status,
        priority: ticket.priority,
        message: 'Support ticket created successfully. You will receive a confirmation email shortly.'
      });
    } catch (error) {
      request.log.error('Error creating support ticket:', error);
      return reply.status(500).send({ error: 'Failed to create support ticket' });
    }
  });

  // Create feature request
  fastify.post<CreateFeatureRequestBody>('/feature-requests', async (request, reply) => {
    const { title, description, customerEmail, organizationId, businessImpact, useCase } = request.body;

    try {
      // Basic validation
      if (!title || !description || !customerEmail) {
        return reply.status(400).send({ 
          error: 'Title, description, and customer email are required' 
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return reply.status(400).send({ 
          error: 'Valid email address is required' 
        });
      }

      const featureRequest = await supportService.createFeatureRequest({
        title,
        description,
        customerEmail,
        organizationId,
        businessImpact,
        useCase
      });

      return reply.send({
        requestId: featureRequest.id,
        status: featureRequest.status,
        priority: featureRequest.priority,
        message: 'Feature request submitted successfully. Our product team will review it and provide updates.'
      });
    } catch (error) {
      request.log.error('Error creating feature request:', error);
      return reply.status(500).send({ error: 'Failed to create feature request' });
    }
  });

  // Get support ticket by ID
  fastify.get('/tickets/:ticketId', async (request: FastifyRequest<{
    Params: { ticketId: string };
  }>, reply) => {
    const { ticketId } = request.params;

    try {
      const ticket = await request.prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!ticket) {
        return reply.status(404).send({ error: 'Support ticket not found' });
      }

      return reply.send(ticket);
    } catch (error) {
      request.log.error('Error fetching support ticket:', error);
      return reply.status(500).send({ error: 'Failed to fetch support ticket' });
    }
  });

  // Get customer's support tickets
  fastify.get('/tickets', async (request: FastifyRequest<{
    Querystring: { 
      email?: string; 
      organizationId?: string;
      status?: string;
      type?: string;
      limit?: string;
    };
  }>, reply) => {
    const { email, organizationId, status, type, limit = '20' } = request.query;

    try {
      if (!email && !organizationId) {
        return reply.status(400).send({ 
          error: 'Email or organization ID is required' 
        });
      }

      const whereClause: any = {};
      if (email) whereClause.customerEmail = email;
      if (organizationId) whereClause.organizationId = organizationId;
      if (status) whereClause.status = status;
      if (type) whereClause.type = type;

      const tickets = await request.prisma.supportTicket.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        include: {
          _count: {
            select: { activities: true }
          }
        }
      });

      return reply.send({ tickets });
    } catch (error) {
      request.log.error('Error fetching support tickets:', error);
      return reply.status(500).send({ error: 'Failed to fetch support tickets' });
    }
  });

  // Get feature requests
  fastify.get('/feature-requests', async (request: FastifyRequest<{
    Querystring: {
      email?: string;
      organizationId?: string;
      status?: string;
      limit?: string;
    };
  }>, reply) => {
    const { email, organizationId, status, limit = '20' } = request.query;

    try {
      const whereClause: any = {};
      if (email) whereClause.customerEmail = email;
      if (organizationId) whereClause.organizationId = organizationId;
      if (status) whereClause.status = status;

      const featureRequests = await request.prisma.featureRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });

      return reply.send({ featureRequests });
    } catch (error) {
      request.log.error('Error fetching feature requests:', error);
      return reply.status(500).send({ error: 'Failed to fetch feature requests' });
    }
  });

  // Upvote feature request
  fastify.post('/feature-requests/:requestId/upvote', async (request: FastifyRequest<{
    Params: { requestId: string };
    Body: { email: string };
  }>, reply) => {
    const { requestId } = request.params;
    const { email } = request.body;

    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({ error: 'Valid email is required' });
      }

      // Check if user already upvoted (in production, you'd track this)
      const featureRequest = await request.prisma.featureRequest.findUnique({
        where: { id: requestId }
      });

      if (!featureRequest) {
        return reply.status(404).send({ error: 'Feature request not found' });
      }

      // Update upvote count
      const updated = await request.prisma.featureRequest.update({
        where: { id: requestId },
        data: { upvotes: { increment: 1 } }
      });

      return reply.send({
        requestId: updated.id,
        upvotes: updated.upvotes,
        message: 'Thank you for your vote! This helps us prioritize features.'
      });
    } catch (error) {
      request.log.error('Error upvoting feature request:', error);
      return reply.status(500).send({ error: 'Failed to upvote feature request' });
    }
  });

  // Get support metrics (for internal use)
  fastify.get('/metrics', async (request: FastifyRequest<{
    Querystring: { timeframe?: 'day' | 'week' | 'month'; apiKey?: string };
  }>, reply) => {
    const { timeframe = 'week', apiKey } = request.query;

    try {
      // Simple API key check (in production, use proper authentication)
      if (apiKey !== process.env.SUPPORT_METRICS_API_KEY) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }

      const metrics = await supportService.getSupportMetrics(timeframe);
      return reply.send(metrics);
    } catch (error) {
      request.log.error('Error fetching support metrics:', error);
      return reply.status(500).send({ error: 'Failed to fetch support metrics' });
    }
  });

  // Health check with quick stats
  fastify.get('/health', async (request, reply) => {
    try {
      const [openTickets, featureRequests] = await Promise.all([
        request.prisma.supportTicket.count({
          where: { status: { in: ['open', 'in_progress'] } }
        }),
        request.prisma.featureRequest.count({
          where: { status: { in: ['submitted', 'under_review'] } }
        })
      ]);

      return reply.send({
        status: 'healthy',
        openTickets,
        pendingFeatureRequests: featureRequests,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      request.log.error('Support service health check failed:', error);
      return reply.status(500).send({
        status: 'unhealthy',
        error: 'Database connection failed'
      });
    }
  });

  // FAQ endpoint for common questions
  fastify.get('/faq', async (request, reply) => {
    const faq = [
      {
        id: 'setup',
        question: 'How do I set up AutoMerge Pro?',
        answer: 'Setting up AutoMerge Pro takes less than 2 minutes. Simply install our GitHub App, select your repositories, and the automation starts immediately with smart defaults.',
        category: 'setup',
        helpful: 0
      },
      {
        id: 'billing',
        question: 'How does billing work?',
        answer: 'We offer monthly and annual billing cycles. You can upgrade, downgrade, or cancel anytime. All plan changes take effect immediately.',
        category: 'billing',
        helpful: 0
      },
      {
        id: 'security',
        question: 'Is my code secure?',
        answer: 'Absolutely. We never store your code. All analysis happens in real-time and results are discarded immediately after processing. We are SOC 2 Type II certified.',
        category: 'security',
        helpful: 0
      },
      {
        id: 'accuracy',
        question: 'How accurate is the AI?',
        answer: 'Our AI has a 99.2% accuracy rate. It learns from your team\'s patterns and gets better over time. You can also set conservative risk thresholds for maximum safety.',
        category: 'ai',
        helpful: 0
      },
      {
        id: 'rules',
        question: 'Can I customize automation rules?',
        answer: 'Yes! You can create custom rules based on file patterns, authors, branches, PR size, risk scores, and more. Rules can be repository-specific or organization-wide.',
        category: 'features',
        helpful: 0
      }
    ];

    return reply.send({ faq });
  });

  // Mark FAQ as helpful
  fastify.post('/faq/:faqId/helpful', async (request: FastifyRequest<{
    Params: { faqId: string };
  }>, reply) => {
    const { faqId } = request.params;

    try {
      // In production, you'd track this in the database
      request.log.info(`FAQ ${faqId} marked as helpful`);
      
      return reply.send({
        faqId,
        message: 'Thank you for your feedback!'
      });
    } catch (error) {
      request.log.error('Error recording FAQ feedback:', error);
      return reply.status(500).send({ error: 'Failed to record feedback' });
    }
  });

  // Contact sales endpoint
  fastify.post('/contact-sales', async (request: FastifyRequest<{
    Body: {
      name: string;
      email: string;
      company: string;
      message?: string;
      phone?: string;
      teamSize?: number;
      currentTools?: string;
    };
  }>, reply) => {
    const { name, email, company, message, phone, teamSize, currentTools } = request.body;

    try {
      // Basic validation
      if (!name || !email || !company) {
        return reply.status(400).send({ 
          error: 'Name, email, and company are required' 
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({ 
          error: 'Valid email address is required' 
        });
      }

      // Create sales inquiry
      const inquiry = await request.prisma.salesInquiry.create({
        data: {
          id: `SAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name,
          email,
          company,
          message,
          phone,
          teamSize,
          currentTools,
          status: 'new',
          source: 'website',
          createdAt: new Date()
        }
      });

      // Notify sales team
      await notificationService.sendEmail({
        to: 'sales@automerge-pro.com',
        subject: `New Sales Inquiry from ${company}`,
        html: `
          <h2>New Sales Inquiry</h2>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Contact:</strong> ${name} (${email})</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          ${teamSize ? `<p><strong>Team Size:</strong> ${teamSize}</p>` : ''}
          ${currentTools ? `<p><strong>Current Tools:</strong> ${currentTools}</p>` : ''}
          ${message ? `<p><strong>Message:</strong><br>${message}</p>` : ''}
          
          <hr>
          <p>Inquiry ID: ${inquiry.id}</p>
        `
      });

      // Send confirmation to customer
      await notificationService.sendEmail({
        to: email,
        subject: 'Thank you for your interest in AutoMerge Pro',
        html: `
          <h2>Thank you for contacting AutoMerge Pro</h2>
          
          <p>Hi ${name},</p>
          
          <p>Thank you for your interest in AutoMerge Pro. We've received your inquiry and our sales team will contact you within 4 business hours to discuss how we can help ${company} improve your development workflow.</p>
          
          <p>In the meantime, feel free to:</p>
          <ul>
            <li><a href="https://automerge-pro.com/demo">Try our interactive demo</a></li>
            <li><a href="https://automerge-pro.com/case-studies">Read customer success stories</a></li>
            <li><a href="https://automerge-pro.com/trial">Start a free 14-day trial</a></li>
          </ul>
          
          <p>Best regards,<br>The AutoMerge Pro Sales Team</p>
          
          <hr>
          <p><small>Inquiry ID: ${inquiry.id}</small></p>
        `
      });

      return reply.send({
        inquiryId: inquiry.id,
        message: 'Thank you for your inquiry! Our sales team will contact you within 4 business hours.'
      });
    } catch (error) {
      request.log.error('Error creating sales inquiry:', error);
      return reply.status(500).send({ error: 'Failed to process sales inquiry' });
    }
  });
}

export default supportRoutes;