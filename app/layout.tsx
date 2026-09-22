import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Abhaya_Libre, Alegreya, Geist } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

import { OverlayLeakProbe } from '@/components/dev/OverlayLeakProbe';
import { pickPublicMessages, PUBLIC_LOCALE_HEADER } from '@/i18n/publicMessages';
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
        icons: {
            icon: [
                { url: '/assets/Logo.svg', media: '(prefers-color-scheme: light)' },
                { url: '/assets/Logo.svg', media: '(prefers-color-scheme: dark)' },
                { url: '/assets/Logo.svg', type: 'image/svg+xml' },
            ],
            apple: '/assets/Logo.svg',
        },
    };
}

export const viewport: Viewport = {
    colorScheme: 'light',
    themeColor: '#fffaf3',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-content',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const locale = await getLocale();
    // The landing page only needs the namespaces its client islands read;
    // every other route keeps the full catalog until it is audited on its own.
    const isPublicLanding = (await headers()).has(PUBLIC_LOCALE_HEADER);
    const messages = isPublicLanding ? pickPublicMessages(await getMessages()) : undefined;

    return (
        <html lang={locale} className={`${geist.className} ${abhayaLibre.variable} ${alegreya.variable} h-dvh bg-background`}>
            <body className="h-(--visual-viewport-height) overflow-hidden overscroll-none antialiased">
                <NextIntlClientProvider messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
                {process.env.NODE_ENV === 'production' ? <Analytics /> : <OverlayLeakProbe />}
            </body>
        </html>
    );
}
