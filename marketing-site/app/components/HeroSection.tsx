'use client';

import { useState } from 'react';

export function HeroSection() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleTrialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/stripe/trial-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setSubmitMessage('Success! Check your email for trial access instructions.');
        setEmail('');
      } else {
        throw new Error('Failed to start trial');
      }
    } catch (error) {
      setSubmitMessage('Error starting trial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen flex items-center">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              🚀 Join 500+ teams saving 15+ hours per developer per month
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered 
              <span className="text-blue-600"> GitHub Automation</span> 
              That Actually Works
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              AutoMerge Pro uses GPT-4 to intelligently review and merge pull requests. 
              Increase developer productivity by 60% while maintaining code quality and security.
            </p>

            {/* Key Benefits */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">15+ hours saved</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">99.9% accuracy</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">2-min setup</span>
              </div>
            </div>

            {/* CTA Form */}
            <form onSubmit={handleTrialSignup} className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-6 py-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg whitespace-nowrap"
              >
                {isSubmitting ? 'Starting Trial...' : 'Start Free Trial'}
              </button>
            </form>

            {submitMessage && (
              <p className={`text-sm ${submitMessage.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                {submitMessage}
              </p>
            )}

            <p className="text-gray-500 text-sm">
              Free 14-day trial • No credit card required • Cancel anytime
            </p>

            {/* Social Proof */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-500 text-sm mb-4">Trusted by developers at</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 opacity-60">
                {/* Company logos would go here */}
                <div className="text-2xl font-bold text-gray-400">TechCorp</div>
                <div className="text-2xl font-bold text-gray-400">ReactiveUI</div>
                <div className="text-2xl font-bold text-gray-400">DevTeam Inc</div>
                <div className="text-2xl font-bold text-gray-400">CodeFlow</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative lg:block">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Mock Dashboard */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div className="ml-4 text-sm text-gray-600 font-medium">AutoMerge Pro Dashboard</div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">2,847</div>
                    <div className="text-sm text-gray-600">PRs Merged</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">42h</div>
                    <div className="text-sm text-gray-600">Time Saved</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">99.2%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                </div>

                {/* Mock PR List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Update README.md</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">Auto-merged</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Fix dependency version</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">AI Analyzing</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium">Refactor auth module</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">Needs Review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -top-6 -right-6 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-green-600">$127k</div>
              <div className="text-sm text-gray-600">Saved in Q4</div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">4.2min</div>
              <div className="text-sm text-gray-600">Avg merge time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}