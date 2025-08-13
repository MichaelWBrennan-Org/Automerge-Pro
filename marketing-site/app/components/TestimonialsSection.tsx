export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      title: 'VP of Engineering',
      company: 'TechCorp',
      avatar: '/avatars/sarah.jpg',
      quote: 'AutoMerge Pro has been a game-changer for our team. We\'ve reduced our PR review time by 70% while maintaining code quality. The AI is incredibly accurate and learns our patterns.',
      metrics: '70% faster reviews',
      logo: '/logos/techcorp.svg'
    },
    {
      name: 'Marcus Rodriguez',
      title: 'DevOps Lead',
      company: 'ReactiveUI',
      avatar: '/avatars/marcus.jpg',
      quote: 'Managing an open-source project with hundreds of contributors was overwhelming. AutoMerge Pro helps us automatically handle routine PRs while flagging the ones that need attention.',
      metrics: '500+ contributors managed',
      logo: '/logos/reactiveui.svg'
    },
    {
      name: 'Jennifer Walsh',
      title: 'CTO',
      company: 'StartupFlow',
      avatar: '/avatars/jennifer.jpg',
      quote: 'The ROI was immediate. Within the first month, we saved over 40 hours of developer time. The setup was so simple that we had it running in under 10 minutes.',
      metrics: '$6,400 saved in month 1',
      logo: '/logos/startupflow.svg'
    },
    {
      name: 'David Kim',
      title: 'Senior Developer',
      company: 'FinTech Solutions',
      avatar: '/avatars/david.jpg',
      quote: 'Security is paramount in our industry. AutoMerge Pro\'s ability to detect security risks in code changes has prevented several potential vulnerabilities from reaching production.',
      metrics: '12 security issues caught',
      logo: '/logos/fintech.svg'
    },
    {
      name: 'Lisa Thompson',
      title: 'Engineering Manager',
      company: 'CloudBase',
      avatar: '/avatars/lisa.jpg',
      quote: 'The analytics dashboard gives us incredible insights into our development process. We can now identify bottlenecks and optimize our workflow based on real data.',
      metrics: '45% productivity increase',
      logo: '/logos/cloudbase.svg'
    },
    {
      name: 'Ahmed Hassan',
      title: 'Lead Architect',
      company: 'ScaleOps',
      avatar: '/avatars/ahmed.jpg',
      quote: 'What impressed us most is how AutoMerge Pro adapts to our coding standards. It learns from our manual reviews and gets better over time. It\'s like having an AI team member.',
      metrics: '92% accuracy rate',
      logo: '/logos/scaleops.svg'
    }
  ];

  const stats = [
    { value: '500+', label: 'Teams Using AutoMerge Pro' },
    { value: '50,000+', label: 'PRs Processed Daily' },
    { value: '99.2%', label: 'Customer Satisfaction' },
    { value: '2.3M', label: 'Hours Saved Collectively' }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Loved by Developers Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of developers and teams who have transformed their workflow with AutoMerge Pro.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              {/* Company Logo */}
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-gray-600">
                    {testimonial.company[0]}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.company}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.metrics}</div>
                </div>
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 mb-6 italic">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Case Studies CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 lg:p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">
            Want to See Detailed Case Studies?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Read in-depth stories about how teams like yours achieved dramatic productivity improvements with AutoMerge Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors">
              Read Case Studies
            </button>
            <button className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
              Watch Customer Stories
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="font-semibold text-gray-900 mb-2">Award Winning</h3>
            <p className="text-gray-600">
              Winner of GitHub's "Best Developer Tool 2024" and featured in TechCrunch's top automation tools.
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">Enterprise Security</h3>
            <p className="text-gray-600">
              SOC 2 Type II certified with bank-grade security. Trusted by Fortune 500 companies worldwide.
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              99.99% uptime with sub-100ms response times. Process thousands of PRs simultaneously.
            </p>
          </div>
        </div>

        {/* G2 Reviews Section */}
        <div className="mt-16 bg-white rounded-xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                See What Users Say on G2
              </h3>
              <div className="flex items-center justify-center md:justify-start mb-2">
                <div className="flex text-yellow-400 mr-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-600">4.9/5 (247 reviews)</span>
              </div>
              <p className="text-gray-600">
                "Easiest setup and most intelligent automation we've ever used"
              </p>
            </div>
            
            <button className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Read All Reviews
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}