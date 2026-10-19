import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { QrWeddingContent } from '@/components/qrWedding/QrWeddingContent';
import { QrWeddingStructuredData } from '@/components/qrWedding/QrWeddingStructuredData';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';
import { makeQueryClient } from '@/lib/queryClient';

export async function QrWeddingPage({ locale }: { locale: Locale }) {
    const queryClient = makeQueryClient();
    let config: AppConfigResponseDto | null = null;

    try {
        config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort: the page still renders and useAppConfig() fetches on the client.
    }

    if (!qrWeddingPageLive(config)) notFound();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <QrWeddingStructuredData locale={locale} />
            <QrWeddingContent locale={locale} />
        </HydrationBoundary>
    );
}
