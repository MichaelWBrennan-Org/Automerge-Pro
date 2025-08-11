import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AutoMerge Pro - AI-Powered GitHub Automation',
  description: 'AI-powered automated pull request reviews and merging with intelligent risk scoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}