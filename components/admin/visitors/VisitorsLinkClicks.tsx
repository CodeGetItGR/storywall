'use client';

import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { VisitorsCountTable } from '@/components/admin/visitors/VisitorsCountTable';
import { linkClickRowKey } from '@/lib/adminVisitors';
import type { LinkClickRowDto } from '@/lib/api/types';

const PLACEMENTS = new Set(['footer', 'faq', 'hero', 'why']);

// Spring's own count of clicks on our links (no cookies), so it shows even without Google Analytics.
export function VisitorsLinkClicks({ rows, failed }: { rows: LinkClickRowDto[] | undefined; failed: boolean }) {
    const t = useTranslations('AdminPage.visitors.linkClicks');

    const tableRows = (rows ?? []).map((row) => ({
        key: linkClickRowKey(row),
        label: (
            <>
                {t(`targets.${row.target}`)} · {PLACEMENTS.has(row.placement) ? t(`placements.${row.placement}`) : row.placement}{' '}
                <span className="font-mono text-xs text-ink-muted">{row.page}</span>
            </>
        ),
        title: row.page,
        count: row.clicks,
    }));

    return (
        <FunnelGroup title={t('title')} window="visit" note={t('note')}>
            {failed ? <p className="text-sm text-status-danger">{t('error')}</p> : <VisitorsCountTable columns={[t('link'), t('clicks')]} rows={tableRows} />}
        </FunnelGroup>
    );
}
