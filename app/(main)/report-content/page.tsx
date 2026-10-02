import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ContentNoticeForm } from '@/components/contentNotice/ContentNoticeForm';
import { routes } from '@/lib/routes';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('ContentNoticePage');
    return { title: `StoryWall - ${t('title')}` };
}

// Public: anyone can report content, signed in or not (DSA Art. 16).
export default async function ReportContentPage() {
    const t = await getTranslations('ContentNoticePage');
    return (
        <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-16">
            <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
            <p className="mt-3 text-sm text-ink-muted">{t('intro')}</p>
            <p className="mt-2 text-sm text-ink-muted">
                {t.rich('guidelines', {
                    link: (chunks) => (
                        <Link className="underline" href={routes.legal.communityGuidelines()}>
                            {chunks}
                        </Link>
                    ),
                })}
            </p>
            <div className="mt-6">
                <ContentNoticeForm />
            </div>
        </main>
    );
}
