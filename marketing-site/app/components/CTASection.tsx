export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800">
      <div className="container mx-auto px-4 text-center text-white">
        <h2 className="text-5xl font-bold mb-6">
          Ready to 10x Your Development Productivity?
        </h2>
        <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
          Join 500+ teams who have already transformed their workflow. Start your free trial today and see results in minutes, not months.
        </p>

        {/* Main CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <button className="bg-white text-blue-600 font-bold px-12 py-4 rounded-lg text-lg hover:bg-gray-100 transition-colors shadow-lg">
            Start Free 14-Day Trial
          </button>
          <button className="border-2 border-white text-white font-bold px-12 py-4 rounded-lg text-lg hover:bg-white hover:text-blue-600 transition-colors">
            Schedule a Demo
          </button>
        </div>

        {/* Guarantees */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold mb-2">2-Minute Setup</h3>
            <p className="text-blue-100 text-sm">
              Install and configure in under 2 minutes. No complex configuration required.
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="font-semibold mb-2">No Credit Card</h3>
            <p className="text-blue-100 text-sm">
              Start your trial immediately. No credit card required for the 14-day trial.
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-semibold mb-2">See Results Fast</h3>
            <p className="text-blue-100 text-sm">
              Start seeing productivity gains within hours of installation.
            </p>
          </div>
        </div>

        {/* Risk-Free Trial Details */}
        <div className="bg-white bg-opacity-10 rounded-xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">What You Get in Your Free Trial</h3>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Full access to all Team plan features</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>AI-powered analysis for unlimited PRs</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Custom automation rules</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Real-time analytics dashboard</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Slack and email notifications</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Priority customer support</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Cancel anytime during trial</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Personal onboarding session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Urgency and Social Proof */}
        <div className="mt-12 text-center">
          <p className="text-blue-100 mb-4">
            <strong>Limited Time:</strong> Get 2 months free when you upgrade to an annual plan during your trial
          </p>
          <p className="text-sm text-blue-200">
            Join companies like TechCorp, ReactiveUI, and 500+ others who trust AutoMerge Pro
          </p>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const faqs = [
    {
      question: 'How does AutoMerge Pro ensure code security?',
      answer: 'AutoMerge Pro never stores your code. All analysis happens in real-time and results are immediately discarded. We\'re SOC 2 Type II certified and follow bank-grade security practices. Your code never leaves GitHub\'s secure environment.'
    },
    {
      question: 'What happens if the AI makes a mistake?',
      answer: 'Our AI has a 99.2% accuracy rate, but we include multiple safety nets. You can set conservative risk thresholds, require manual review for sensitive files, and easily rollback any automated merges. The system learns from your feedback to improve over time.'
    },
    {
      question: 'How long does setup take?',
      answer: 'Installation takes under 2 minutes. Simply install our GitHub App, select your repositories, and you\'re ready to go. Our AI starts learning your patterns immediately, and most teams see productivity gains within the first day.'
    },
    {
      question: 'Can I customize the automation rules?',
      answer: 'Absolutely! You can create custom rules based on file patterns, authors, branch names, PR size, risk scores, and more. Rules can be repository-specific or organization-wide. We also provide smart defaults that work for most teams.'
    },
    {
      question: 'What integrations do you support?',
      answer: 'We integrate with Slack, Microsoft Teams, email, Jira, Linear, and custom webhooks. Our API allows for custom integrations with your existing tools. We\'re continuously adding new integrations based on customer feedback.'
    },
    {
      question: 'How does pricing work for multiple repositories?',
      answer: 'Our Team plan includes 10 repositories, Growth includes unlimited repositories. If you exceed limits on the Team plan, we charge $10/month per additional repository. You can always upgrade to Growth for unlimited repos at any time.'
    },
    {
      question: 'Do you offer enterprise features?',
      answer: 'Yes! Enterprise plans include SSO integration, on-premise deployment, custom SLA agreements, dedicated support, audit logging, and custom AI model training. Contact our sales team for a customized solution.'
    },
    {
      question: 'What kind of support do you provide?',
      answer: 'All paid plans include priority support. Team plans get email support with 24-hour response times. Growth and Enterprise plans get dedicated Slack channels and phone support. Enterprise customers get a dedicated success manager.'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Got questions? We've got answers. If you don't see your question here, our support team is ready to help.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Still Have Questions CTA */}
        <div className="mt-16 text-center bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Still Have Questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Our team of experts is here to help you get started and make the most of AutoMerge Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Contact Support
            </button>
            <button className="border border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
              Schedule a Call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="text-2xl font-bold mb-4">AutoMerge Pro</div>
            <p className="text-gray-400 mb-6">
              AI-powered GitHub automation that helps teams ship faster while maintaining code quality.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status Page</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 AutoMerge Pro. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">
              🔒 SOC 2 Type II Certified
            </span>
            <span className="text-gray-400 text-sm">
              🛡️ GDPR Compliant
            </span>
            <span className="text-gray-400 text-sm">
              ⚡ 99.99% Uptime SLA
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}