import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Banking CRM Agent',
  description: 'AI-powered multi-tenant banking CRM for personal loan conversion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-full`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
