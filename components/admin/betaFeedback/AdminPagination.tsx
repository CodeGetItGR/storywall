'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Page } from '@/lib/api/pagination';

export function AdminPagination({
    pageInfo,
    page,
    summary,
    onPageChangeAction,
}: {
    pageInfo: Page<unknown>['page'];
    // e.g. "12 reports"
    summary: string;
    page: number;
    onPageChangeAction: (page: number) => void;
}) {
    const t = useTranslations('AdminPage.accounts');

    function goPrevious() {
        onPageChangeAction(page - 1);
    }

    function goNext() {
        onPageChangeAction(page + 1);
    }

    return (
        <footer className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5">
            <p className="text-xs text-ink-faint">{summary}</p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={goPrevious}
                    aria-label={t('previous')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas disabled:opacity-30"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-20 text-center text-xs font-semibold text-ink-muted">
                    {t('page', { current: pageInfo.number + 1, total: Math.max(1, pageInfo.totalPages) })}
                </span>
                <button
                    type="button"
                    disabled={pageInfo.number + 1 >= pageInfo.totalPages}
                    onClick={goNext}
                    aria-label={t('next')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas disabled:opacity-30"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </footer>
    );
}
