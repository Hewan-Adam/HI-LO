import type { Metadata } from 'next';
import { Manrope, IBM_Plex_Mono } from 'next/font/google';
import { AuthGate } from '../components/AuthGate';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ibm-plex-mono' });

export const metadata: Metadata = {
  title: 'Hi-Lo Admin',
  description: 'Internal operations dashboard for the Hi-Lo card game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className={`${manrope.variable} ${ibmPlexMono.variable} font-body`}>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
