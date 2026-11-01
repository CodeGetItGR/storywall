import { CookieConsent } from '@/components/consent/CookieConsent';
import { QrWeddingCompare } from '@/components/qrWedding/QrWeddingCompare';
import { QrWeddingDemo } from '@/components/qrWedding/QrWeddingDemo';
import { QrWeddingDemoStrip } from '@/components/qrWedding/QrWeddingDemoStrip';
import { QrWeddingFaq } from '@/components/qrWedding/QrWeddingFaq';
import { QrWeddingFeatures } from '@/components/qrWedding/QrWeddingFeatures';
import { QrWeddingFinalCta } from '@/components/qrWedding/QrWeddingFinalCta';
import { QrWeddingFooter } from '@/components/qrWedding/QrWeddingFooter';
import { QrWeddingGuestPhotos } from '@/components/qrWedding/QrWeddingGuestPhotos';
import { QrWeddingHeader } from '@/components/qrWedding/QrWeddingHeader';
import { QrWeddingHero } from '@/components/qrWedding/QrWeddingHero';
import { QrWeddingHowItWorks } from '@/components/qrWedding/QrWeddingHowItWorks';
import { QrWeddingPricing } from '@/components/qrWedding/QrWeddingPricing';
import { QrWeddingTableCards } from '@/components/qrWedding/QrWeddingTableCards';
import { QrWeddingTimeline } from '@/components/qrWedding/QrWeddingTimeline';
import { QrWeddingTryIt } from '@/components/qrWedding/QrWeddingTryIt';
import type { Locale } from '@/i18n/config';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import type { QrWeddingFaqItem } from '@/lib/qrWeddingPage';
import { cn } from '@/lib/utils';

// The page's sections in order. price: the cheapest wedding package, or empty; faq: with the price filled in.
export function QrWeddingContent({ locale, price, faq }: { locale: Locale; price: string; faq: QrWeddingFaqItem[] }) {
    return (
        <>
            <div
                className={cn(
                    LANDING_TOKENS_CLASS,
                    'relative overflow-x-clip bg-white font-[Arial,Helvetica,sans-serif] text-[14px] leading-[normal] text-[#151313]',
                )}
            >
                {/* Header */}
                <QrWeddingHeader locale={locale} />

                <main>
                    {/* Hero */}
                    <QrWeddingHero locale={locale} price={price} />

                    {/* How it works */}
                    <QrWeddingHowItWorks locale={locale} />

                    {/* Demo strip */}
                    <QrWeddingDemoStrip locale={locale} />

                    {/* Guests' photos */}
                    <QrWeddingGuestPhotos locale={locale} />

                    {/* Try it */}
                    <QrWeddingTryIt locale={locale} />

                    {/* Comparison */}
                    <QrWeddingCompare locale={locale} price={price} />

                    {/* The day */}
                    <QrWeddingTimeline locale={locale} />

                    {/* Table cards */}
                    <QrWeddingTableCards locale={locale} />

                    {/* Features */}
                    <QrWeddingFeatures locale={locale} />

                    {/* Demo */}
                    <QrWeddingDemo locale={locale} />

                    {/* Pricing */}
                    <QrWeddingPricing locale={locale} />

                    {/* FAQ */}
                    <QrWeddingFaq items={faq} locale={locale} />

                    {/* Final call to action */}
                    <QrWeddingFinalCta locale={locale} />
                </main>

                {/* Footer */}
                <QrWeddingFooter locale={locale} />
            </div>

            {/* Cookie consent */}
            <CookieConsent />
        </>
    );
}
