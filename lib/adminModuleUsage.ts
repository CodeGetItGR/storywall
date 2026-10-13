import { EMPTY_VALUE, formatRate, rateOf } from '@/lib/adminFunnel';
import type { ModuleUsageMetricDto, ModuleUsageMetricKey, ModuleUsageModuleKey, ModuleUsageResponseDto, ModuleUsageRowDto } from '@/lib/api/types';
import { numberFormat } from '@/lib/format';

/** Table order. A module the backend doesn't send is left out; one it sends that isn't listed here is ignored. */
export const MODULE_USAGE_ORDER: readonly ModuleUsageModuleKey[] = [
    'posts',
    'gallery',
    'stories',
    'wishbook',
    'rsvp',
    'playlist',
    'schedule',
    'wishlist',
    'qr_links',
];

const METRIC_KEYS: readonly ModuleUsageMetricKey[] = [
    'posts',
    'comments',
    'reactions',
    'commentsPerPost',
    'reactionsPerPost',
    'eventsWithComments',
    'eventsWithReactions',
    'media',
    'photoShare',
    'videoShare',
    'qrUploadShare',
    'stories',
    'responses',
    'suggestions',
    'votes',
    'sessions',
    'wishes',
    'qrJoins',
    'qrUploads',
];

export type ModuleUsageMetricRow = { key: ModuleUsageMetricKey; average: string; median: string; share: string };

export type ModuleUsageModuleRow =
    | { moduleKey: ModuleUsageModuleKey; suppressed: true }
    | {
          moduleKey: ModuleUsageModuleKey;
          suppressed: false;
          events: string;
          used: string;
          usedCount: string;
          metrics: ModuleUsageMetricRow[];
      };

function formatAverage(locale: string, value: number | null): string {
    if (value === null || !Number.isFinite(value)) return EMPTY_VALUE;
    return numberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function formatCountValue(locale: string, value: number | null): string {
    if (value === null || !Number.isFinite(value)) return EMPTY_VALUE;
    return numberFormat(locale).format(value);
}

function metricRow(locale: string, metric: ModuleUsageMetricDto): ModuleUsageMetricRow {
    if (metric.kind === 'SHARE') return { key: metric.key, average: EMPTY_VALUE, median: EMPTY_VALUE, share: formatRate(locale, metric.share) };
    return { key: metric.key, average: formatAverage(locale, metric.average), median: formatAverage(locale, metric.median), share: EMPTY_VALUE };
}

function moduleRow(locale: string, row: ModuleUsageRowDto): ModuleUsageModuleRow {
    // Hidden on the server too; a null count here also means "too few", never a number to guess at.
    if (row.suppressed || row.eventsWithModule === null) return { moduleKey: row.moduleKey, suppressed: true };
    return {
        moduleKey: row.moduleKey,
        suppressed: false,
        events: formatCountValue(locale, row.eventsWithModule),
        used: formatRate(locale, row.eventsUsed === null ? null : rateOf(row.eventsUsed, row.eventsWithModule)),
        usedCount: formatCountValue(locale, row.eventsUsed),
        metrics: row.metrics.filter((metric) => METRIC_KEYS.includes(metric.key)).map((metric) => metricRow(locale, metric)),
    };
}

/** The table rows in display order, or null when too few events match to show anything. */
export function moduleUsageRows(locale: string, usage: ModuleUsageResponseDto): ModuleUsageModuleRow[] | null {
    if (usage.eventsInScope === null) return null;
    return MODULE_USAGE_ORDER.flatMap((moduleKey) => {
        const row = usage.modules.find((candidate) => candidate.moduleKey === moduleKey);
        return row ? [moduleRow(locale, row)] : [];
    });
}
