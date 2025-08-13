export function FeaturesSection() {
  const features = [
    {
      icon: '🤖',
      title: 'GPT-4 Powered AI Analysis',
      description: 'Advanced AI analyzes code changes, security implications, and breaking changes with 99.2% accuracy.',
      benefits: ['Security vulnerability detection', 'Breaking change analysis', 'Code quality assessment', 'Risk scoring 0-1 scale']
    },
    {
      icon: '⚡',
      title: 'Smart Automation Rules',
      description: 'Create custom rules for automatic approval and merging based on file patterns, authors, and risk scores.',
      benefits: ['File pattern matching', 'Author-based rules', 'Branch protection', 'Risk thresholds']
    },
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboard showing merge times, productivity gains, and team performance metrics.',
      benefits: ['Productivity tracking', 'Time savings metrics', 'Team collaboration stats', 'ROI calculations']
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Get notified only when it matters with intelligent filtering and multi-channel support.',
      benefits: ['Slack integration', 'Email notifications', 'Custom webhooks', 'Smart filtering']
    },
    {
      icon: '🛡️',
      title: 'Enterprise Security',
      description: 'Bank-grade security with OWASP compliance, SSO integration, and audit logging.',
      benefits: ['OWASP compliance', 'SSO integration', 'Audit logging', 'Permission management']
    },
    {
      icon: '🚀',
      title: 'Seamless Integration',
      description: 'Works with your existing workflow. Install in 2 minutes and start automating immediately.',
      benefits: ['GitHub App integration', '2-minute setup', 'Zero configuration', 'Existing workflow support']
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need to Automate Pull Requests
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AutoMerge Pro combines cutting-edge AI with proven automation techniques to deliver 
            the most intelligent GitHub automation solution available.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-6">{feature.description}</p>
              
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Technical Details Section */}
        <div className="mt-20 bg-gray-900 rounded-2xl p-8 lg:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Built for Enterprise Scale</h3>
              <p className="text-gray-300 mb-8">
                AutoMerge Pro is built on modern, scalable infrastructure designed to handle 
                enterprise workloads while maintaining security and reliability.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">99.99%</div>
                  <div className="text-gray-300">Uptime SLA</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">< 100ms</div>
                  <div className="text-gray-300">API Response Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">10,000+</div>
                  <div className="text-gray-300">PRs per Hour</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">SOC 2</div>
                  <div className="text-gray-300">Type II Compliant</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {['Next.js', 'Fastify', 'PostgreSQL', 'Redis', 'AWS Lambda', 'OpenAI GPT-4'].map((tech) => (
                    <span key={tech} className="bg-gray-700 px-2 py-1 rounded text-sm">{tech}</span>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Security & Compliance</h4>
                <div className="flex flex-wrap gap-2">
                  {['OWASP Top 10', 'SOC 2', 'GDPR', 'CCPA', 'ISO 27001'].map((cert) => (
                    <span key={cert} className="bg-gray-700 px-2 py-1 rounded text-sm">{cert}</span>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Integrations</h4>
                <div className="flex flex-wrap gap-2">
                  {['GitHub', 'Slack', 'Microsoft Teams', 'Jira', 'Linear', 'Webhooks'].map((integration) => (
                    <span key={integration} className="bg-gray-700 px-2 py-1 rounded text-sm">{integration}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}