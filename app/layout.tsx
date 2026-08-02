import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Abhaya_Libre, Alegreya, Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

import { Providers } from '@/providers/Providers';

const geist = Geist({ subsets: ['latin'] });

const abhayaLibre = Abhaya_Libre({
    variable: '--font-abhaya-libre',
    subsets: ['latin'],
    weight: ['400'],
});

const alegreya = Alegreya({
    variable: '--font-alegreya',
    subsets: ['latin'],
    weight: ['400'],
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('RootLayout');
    return {
        title: t('title'),
        description: t('description'),
    };
}

export const viewport: Viewport = {
    colorScheme: 'light',
    themeColor: '#fffaf3',
    width: 'device-width',
    initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${geist.className} ${abhayaLibre.variable} ${alegreya.variable} bg-background`}>
            <body className="antialiased">
                <NextIntlClientProvider>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
                {process.env.NODE_ENV === 'production' && <Analytics />}
            </body>
        </html>
    );
}
