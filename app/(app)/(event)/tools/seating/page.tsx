'use client';

import { ArrowLeft, LayoutGrid, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { seatingTables } from '@/lib/mock-data';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function SeatingPage() {
    const t = useTranslations('SeatingPage');
    const [search, setSearch] = useState('');
    const [expandedTable, setExpandedTable] = useState<string | null>(null);

    const allGuests = seatingTables.flatMap((t) => t.guests.map((g) => ({ ...g, tableName: t.name, tableId: t.id })));

    const searchResults = search.trim() ? allGuests.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())) : [];

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearch('');
    }, []);

    const handleTableToggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const tableId = event.currentTarget.dataset.tableId;
        if (!tableId) return;
        setExpandedTable((current) => (current === tableId ? null : tableId));
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <Link
                    href={routes.tools.root}
                    aria-label={t('backToTools')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            <p className="text-sm text-ink-muted mb-5 leading-relaxed">{t('subtitle')}</p>

            {/* Search */}
            <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 mb-5 focus-within:ring-2 focus-within:ring-primary/30 transition">
                <Search className="w-4 h-4 text-ink-muted flex-shrink-0" />
                <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                    aria-label={t('searchAriaLabel')}
                />
                {search && (
                    <button
                        onClick={handleClearSearch}
                        aria-label={t('clearSearch')}
                        className="text-ink-faint hover:text-ink-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search results */}
            {search.trim() && (
                <div className="mb-5">
                    {searchResults.length === 0 ? (
                        <p className="text-sm text-ink-muted text-center py-6">{t('noGuestsFound', { search })}</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {searchResults.map((g) => (
                                <div
                                    key={g.id}
                                    className="flex items-center justify-between bg-primary-light rounded-xl px-4 py-3 border border-primary/20"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{g.name}</p>
                                        <p className="text-xs text-primary-dark font-medium mt-0.5">{g.tableName}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                                        <LayoutGrid className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tables grid */}
            <h2 className="text-sm font-bold text-ink mb-3">{t('allTables')}</h2>
            <div className="flex flex-col gap-3">
                {seatingTables.map((table) => {
                    const isExpanded = expandedTable === table.id;
                    const seats = table.guests.length;

                    return (
                        <div key={table.id} className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                            <button
                                data-table-id={table.id}
                                onClick={handleTableToggle}
                                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-surface-muted/50 transition-colors"
                                aria-expanded={isExpanded}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <LayoutGrid className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{table.name}</p>
                                        <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                                            <Users className="w-3 h-3" aria-hidden="true" />
                                            {t('seatsCount', { seats, capacity: table.capacity })}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className={cn(
                                        'w-5 h-5 flex items-center justify-center text-ink-faint transition-transform',
                                        isExpanded && 'rotate-180'
                                    )}
                                    aria-hidden="true"
                                >
                                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                                        <path d="M8 10.5 L3 5.5 L13 5.5 Z" />
                                    </svg>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-border px-4 pb-4 pt-3">
                                    <div className="flex flex-wrap gap-2">
                                        {table.guests.map((g) => (
                                            <span key={g.id} className="px-3 py-1.5 rounded-full bg-surface-muted text-xs font-medium text-ink">
                                                {g.name}
                                            </span>
                                        ))}
                                        {/* Empty seats */}
                                        {Array.from({ length: table.capacity - seats }).map((_, i) => (
                                            <span
                                                key={`empty-${i}`}
                                                className="px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-ink-faint"
                                            >
                                                {t('emptySeat')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
