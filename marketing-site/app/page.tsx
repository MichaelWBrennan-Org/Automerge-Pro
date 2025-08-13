import { Metadata } from 'next';
import { HeroSection } from '../components/HeroSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { DemoSection } from '../components/DemoSection';
import { PricingSection } from '../components/PricingSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { CTASection } from '../components/CTASection';
import { FAQSection } from '../components/FAQSection';
import { FooterSection } from '../components/FooterSection';

export const metadata: Metadata = {
  title: 'AutoMerge Pro - AI-Powered GitHub Automation | Increase Developer Productivity by 60%',
  description: 'AutoMerge Pro uses GPT-4 AI to automatically review and merge pull requests. Save 15+ hours per developer per month with intelligent risk scoring and smart automation rules. Free 14-day trial.',
  keywords: 'GitHub automation, pull request automation, AI code review, developer productivity, DevOps tools, GitHub app, code merge automation, CI/CD optimization, software development efficiency',
  authors: [{ name: 'AutoMerge Pro Team' }],
  openGraph: {
    title: 'AutoMerge Pro - AI-Powered GitHub Automation',
    description: 'Save 15+ hours per developer per month with AI-powered pull request automation. Free 14-day trial.',
    url: 'https://automerge-pro.com',
    siteName: 'AutoMerge Pro',
    images: [{
      url: 'https://automerge-pro.com/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'AutoMerge Pro - AI-Powered GitHub Automation'
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoMerge Pro - AI-Powered GitHub Automation',
    description: 'Save 15+ hours per developer per month with AI-powered pull request automation.',
    images: ['https://automerge-pro.com/twitter-image.jpg'],
    creator: '@automerge_pro'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://automerge-pro.com',
  }
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <FooterSection />
    </>
  );
}