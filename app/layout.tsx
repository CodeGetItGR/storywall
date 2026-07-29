import { Geist, Abhaya_Libre, Alegreya } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers/Providers'
import './globals.css'
import {ReactNode} from "react";

const geist = Geist({ subsets: ['latin'] })

const abhayaLibre = Abhaya_Libre({
  variable: "--font-abhaya-libre",
  subsets: ["latin"],
  weight: ["400"],
});

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: 'StoryWall — Emma & James · Oct 18, 2025',
  description: 'The wedding social wall for Emma Chen & James Rivera. Share memories, RSVP, explore the venue, and celebrate together.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fffaf3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${geist.className} ${abhayaLibre.variable} ${alegreya.variable} bg-background`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
