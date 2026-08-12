'use client';

import { ArrowLeft, Check, ExternalLink, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { giftItems } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'available' | 'reserved';

const priorityColor: Record<string, string> = {
    high: 'text-rose-500 bg-rose-50',
    medium: 'text-amber-500 bg-amber-50',
    low: 'text-sky-500 bg-sky-50',
};

export default function GiftsPage() {
    const t = useTranslations('GiftsPage');
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>('all');
    const [reserved, setReserved] = useState<Set<string>>(new Set(giftItems.filter((g) => g.reserved).map((g) => g.id)));

    const displayed = giftItems.filter((g) => {
        if (filter === 'available') return !reserved.has(g.id);
        if (filter === 'reserved') return reserved.has(g.id);
        return true;
    });

    function handleReserve(id: string) {
        setReserved((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const nextFilter = event.currentTarget.dataset.filter as Filter | undefined;
        if (nextFilter) setFilter(nextFilter);
    }, []);

    const handleReserveClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const giftId = event.currentTarget.dataset.giftId;
        if (giftId) handleReserve(giftId);
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <button
                    onClick={handleBack}
                    aria-label={t('goBack')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base font-bold text-ink">{t('title')}</h1>
            </div>

            <p className="text-sm text-ink-muted mb-5 leading-relaxed">{t('subtitle')}</p>

            {/* Filter pills */}
            <div className="flex gap-2 mb-5">
                {(['all', 'available', 'reserved'] as Filter[]).map((f) => (
                    <button
                        key={f}
                        data-filter={f}
                        onClick={handleFilterClick}
                        className={cn(
                            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize',
                            filter === f ? 'bg-primary text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                        )}
                    >
                        {t(`filters.${f}`)}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayed.map((item) => {
                    const isReserved = reserved.has(item.id);
                    return (
                        <div
                            key={item.id}
                            className={cn(
                                'bg-card rounded-2xl border shadow-sm overflow-hidden transition-all',
                                isReserved ? 'border-border opacity-70' : 'border-border/50 hover:shadow-md'
                            )}
                        >
                            {/* Category tag */}
                            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                                <span className="text-xs text-ink-muted font-medium">{item.category}</span>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', priorityColor[item.priority])}>
                                    <Star className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" strokeWidth={2} />
                                    {t(`priority.${item.priority}`)}
                                </span>
                            </div>

                            <div className="px-4 pb-4">
                                <h3 className={cn('text-sm font-semibold text-ink leading-snug mb-1', isReserved && 'line-through text-ink-muted')}>
                                    {item.name}
                                </h3>
                                {item.notes && <p className="text-xs text-ink-muted mb-2">{item.notes}</p>}
                                <p className="text-lg font-bold text-ink tabular-nums mb-3">${item.price.toLocaleString()}</p>

                                {isReserved ? (
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                        <Check className="w-4 h-4" />
                                        {item.reservedBy ? t('reservedByName', { name: item.reservedBy }) : t('reserved')}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            data-gift-id={item.id}
                                            onClick={handleReserveClick}
                                            className="flex-1 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
                                        >
                                            {t('reserveGift')}
                                        </button>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={t('viewOn', {
                                                    name: item.name,
                                                    category: item.category,
                                                })}
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
