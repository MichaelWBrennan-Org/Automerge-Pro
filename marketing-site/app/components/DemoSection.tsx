'use client';

import { useState } from 'react';

export function DemoSection() {
  const [activeDemo, setActiveDemo] = useState<'ai-analysis' | 'automation' | 'dashboard'>('ai-analysis');

  const demos = {
    'ai-analysis': {
      title: 'AI Risk Analysis in Action',
      description: 'Watch how our GPT-4 powered AI analyzes a security-sensitive pull request in real-time.',
      content: (
        <div className="bg-gray-900 rounded-lg p-6 text-green-400 font-mono text-sm">
          <div className="mb-4">
            <span className="text-blue-400">$</span> Analyzing PR #247: "Update authentication middleware"
          </div>
          <div className="space-y-2">
            <div>✓ Scanning 3 files for security implications...</div>
            <div>✓ Detecting authentication logic changes...</div>
            <div className="text-yellow-400">⚠ High-risk change detected in auth.ts</div>
            <div>✓ Checking for breaking changes...</div>
            <div>✓ Analyzing test coverage...</div>
            <div className="mt-4 p-3 bg-red-900 bg-opacity-50 rounded">
              <div className="text-red-400 font-bold">Risk Score: 0.8 (High)</div>
              <div className="text-gray-300 mt-2">
                <div>• Authentication logic modification detected</div>
                <div>• JWT validation changes require security review</div>
                <div>• Recommend manual review before merge</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'automation': {
      title: 'Smart Automation Rules',
      description: 'See how customizable rules automatically handle different types of pull requests.',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="font-semibold text-green-800">Documentation Update</span>
            </div>
            <p className="text-green-700 text-sm mb-2">Rule: Auto-merge documentation-only changes</p>
            <div className="text-xs text-green-600">
              ✓ Files: README.md, docs/api.md | Risk: 0.1 | Action: Auto-merged in 15 seconds
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="font-semibold text-blue-800">Dependabot Update</span>
            </div>
            <p className="text-blue-700 text-sm mb-2">Rule: Auto-merge minor dependency updates</p>
            <div className="text-xs text-blue-600">
              ✓ Author: dependabot[bot] | Type: patch | Risk: 0.2 | Action: Auto-merged after CI passes
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <span className="font-semibold text-yellow-800">Security Change</span>
            </div>
            <p className="text-yellow-700 text-sm mb-2">Rule: Require manual review for auth changes</p>
            <div className="text-xs text-yellow-600">
              ⚠ Files: auth.ts, middleware.ts | Risk: 0.8 | Action: Manual review required
            </div>
          </div>
        </div>
      )
    },
    'dashboard': {
      title: 'Analytics Dashboard',
      description: 'Real-time insights into your team\'s productivity and automation performance.',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 mb-1">847</div>
            <div className="text-sm text-gray-600">PRs This Month</div>
            <div className="text-xs text-green-600 mt-1">↑ 23% from last month</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 mb-1">67%</div>
            <div className="text-sm text-gray-600">Auto-merged</div>
            <div className="text-xs text-green-600 mt-1">↑ 12% from last month</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 mb-1">4.2min</div>
            <div className="text-sm text-gray-600">Avg Merge Time</div>
            <div className="text-xs text-green-600 mt-1">↓ 78% improvement</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600 mb-1">42h</div>
            <div className="text-sm text-gray-600">Time Saved</div>
            <div className="text-xs text-green-600 mt-1">$6,720 value</div>
          </div>
        </div>
      )
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            See AutoMerge Pro in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of AI-driven automation with our interactive demos. 
            See exactly how AutoMerge Pro will transform your development workflow.
          </p>
        </div>

        {/* Demo Navigation */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <div className="space-y-3">
              {Object.entries(demos).map(([key, demo]) => (
                <button
                  key={key}
                  onClick={() => setActiveDemo(key as any)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    activeDemo === key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="font-semibold mb-1">{demo.title}</div>
                  <div className={`text-sm ${activeDemo === key ? 'text-blue-100' : 'text-gray-500'}`}>
                    {demo.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Live Demo CTA */}
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white">
              <h3 className="font-semibold mb-2">Want a Personalized Demo?</h3>
              <p className="text-sm text-purple-100 mb-4">
                Schedule a 15-minute demo tailored to your team's workflow.
              </p>
              <button className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded hover:bg-gray-100 transition-colors">
                Schedule Demo Call
              </button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {demos[activeDemo].title}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {demos[activeDemo].description}
                </p>
              </div>
              
              <div className="p-6">
                {demos[activeDemo].content}
              </div>
            </div>

            {/* Interactive Elements */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-3xl mb-2">⚡</div>
                <div className="font-semibold text-gray-900">2-Minute Setup</div>
                <div className="text-sm text-gray-600">Install and configure in under 2 minutes</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <div className="font-semibold text-gray-900">Zero False Positives</div>
                <div className="text-sm text-gray-600">AI learns your patterns for perfect accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">Join 500+ teams already using AutoMerge Pro</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-gray-400">TechCorp</div>
            <div className="text-2xl font-bold text-gray-400">ReactiveUI</div>
            <div className="text-2xl font-bold text-gray-400">DevFlow</div>
            <div className="text-2xl font-bold text-gray-400">CodeBase</div>
            <div className="text-2xl font-bold text-gray-400">BuildTech</div>
          </div>
        </div>
      </div>
    </section>
  );
}