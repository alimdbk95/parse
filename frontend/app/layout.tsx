import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Parse - AI Research Analysis',
  description: 'AI-powered research tool for document analysis, data extraction, and visualization',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
