'use client';

import { useState } from 'react';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'team',
      name: 'Team',
      description: 'Perfect for small to medium teams',
      monthlyPrice: 99,
      annualPrice: 990, // 17% discount
      features: [
        '10 repositories',
        'AI-powered analysis',
        'Advanced automation rules',
        'Slack & email notifications',
        'Priority support',
        'Analytics dashboard',
        'Custom integrations'
      ],
      popular: true,
      cta: 'Start Free Trial'
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'For growing teams and enterprises',
      monthlyPrice: 299,
      annualPrice: 2990, // 17% discount
      features: [
        'Unlimited repositories',
        'Premium AI models',
        'Compliance reporting',
        'Advanced webhooks',
        'Custom policies',
        'SSO integration',
        'Dedicated support channel',
        'Usage analytics',
        'API access'
      ],
      popular: false,
      cta: 'Start Free Trial'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      monthlyPrice: 999,
      annualPrice: 9990, // 17% discount
      features: [
        'Everything in Growth',
        'On-premise deployment',
        'Custom SLA agreements',
        'Dedicated success manager',
        'Custom AI model training',
        'Advanced security features',
        'Audit logging',
        'Custom integrations',
        'Training & onboarding'
      ],
      popular: false,
      cta: 'Contact Sales'
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'enterprise') {
      // Handle enterprise contact
      window.open('/contact-sales', '_blank');
      return;
    }

    setLoadingPlan(planId);
    
    try {
      // Create checkout session
      const response = await fetch(`/api/stripe/checkout/demo-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/success?plan=${planId}`,
          cancelUrl: window.location.href
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      // Fallback to trial signup
      window.location.href = '/trial-signup';
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: typeof plans[0]) => {
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
    const period = isAnnual ? 'year' : 'month';
    return { price, period };
  };

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const savings = monthlyCost - annualPrice;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your team size and needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                !isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Annual
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const { price, period } = getPrice(plan);
            const { savings, percentage } = calculateSavings(plan.monthlyPrice, plan.annualPrice);
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                } hover:shadow-lg transition-shadow`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">${price}</span>
                    <span className="text-gray-600">/{period}</span>
                  </div>

                  {isAnnual && (
                    <div className="text-green-600 text-sm font-medium">
                      Save ${savings} per year ({percentage}% off)
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingPlan === plan.id ? 'Loading...' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* ROI Calculator */}
        <div className="mt-20 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Calculate Your ROI
            </h3>
            <p className="text-xl text-gray-600">
              See how much time and money AutoMerge Pro can save your team
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-2">15h</div>
              <div className="text-gray-700 font-medium">Hours Saved</div>
              <div className="text-sm text-gray-500">per developer/month</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-2">$2,400</div>
              <div className="text-gray-700 font-medium">Cost Savings</div>
              <div className="text-sm text-gray-500">per developer/month</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">60%</div>
              <div className="text-gray-700 font-medium">Faster Delivery</div>
              <div className="text-sm text-gray-500">feature deployment</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-orange-600 mb-2">24x</div>
              <div className="text-gray-700 font-medium">ROI</div>
              <div className="text-sm text-gray-500">return on investment</div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">
              *Based on average developer salary of $160/hour and typical automation rates
            </p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Get Custom ROI Report
            </button>
          </div>
        </div>

        {/* FAQ Quick Answers */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens after the trial?</h4>
              <p className="text-gray-600">You can continue with a paid plan or revert to our free tier with limited features.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is my code secure?</h4>
              <p className="text-gray-600">Absolutely. We never store your code. Analysis happens in real-time and results are discarded after processing.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do you offer discounts?</h4>
              <p className="text-gray-600">Yes! We offer discounts for annual plans, educational institutions, and open-source projects.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}