import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Poppins } from 'next/font/google';
import './globals.css';
import { NavShell } from '@/components/nav-shell';
import { ThemeProvider } from '@/components/theme-provider';

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

// Large headings / hero text only — body copy stays IBM Plex Sans.
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'RPI Ambulance Members',
  description: 'RPI Ambulance member portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <NavShell>{children}</NavShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
