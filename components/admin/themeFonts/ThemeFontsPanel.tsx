'use client';

import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { ThemeFontDrawer } from '@/components/admin/themeFonts/ThemeFontDrawer';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import { themeFontStatus } from '@/lib/adminThemeFonts';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminThemeFontDto } from '@/lib/api/types';
import { themeFontFamily } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

// token: which opening this is. A drawer closes only its own opening, so a save that finishes after
// the admin moved on (or a create, which has no id) can't close the drawer they have open now.
type DrawerState = { open: false } | { open: true; font: AdminThemeFontDto | null; token: number };

const STATUS_PILL = {
    READY: 'bg-status-good-wash text-status-good',
    NEEDS_FILE: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
} as const;

const FALLBACK_LABEL = { serif: 'fallbacks.serif', 'sans-serif': 'fallbacks.sansSerif' } as const;

export function ThemeFontsPanel() {
    const t = useTranslations('AdminPage.themeFonts');
    const tAdmin = useTranslations('AdminPage');
    const fontsQuery = useAdminThemeFonts();
    const fonts = fontsQuery.data ?? [];
    const [drawer, setDrawer] = useState<DrawerState>({ open: false });
    const nextToken = useRef(0);

    function openDrawer(font: AdminThemeFontDto | null) {
        nextToken.current += 1;
        setDrawer({ open: true, font, token: nextToken.current });
    }

    function openCreate() {
        openDrawer(null);
    }

    // Bound to the opening it was rendered for: a stale call finds a different token and does nothing.
    const openToken = drawer.open ? drawer.token : 0;
    const closeDrawer = useCallback(() => {
        setDrawer((current) => (current.open && current.token === openToken ? { open: false } : current));
    }, [openToken]);

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Fonts */}
            <section className="rounded-xl border border-border bg-card">
                {fontsQuery.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {fontsQuery.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(fontsQuery.error)}`)}</p>}
                {!fontsQuery.isLoading && !fontsQuery.error && fonts.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>
                )}
                {!fontsQuery.isLoading && !fontsQuery.error && fonts.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-160 text-left">
                            <thead>
                                <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-3 py-2">{t('columns.font')}</th>
                                    <th className="px-3 py-2">{t('columns.key')}</th>
                                    <th className="px-3 py-2">{t('columns.fallback')}</th>
                                    <th className="px-3 py-2">{t('columns.presets')}</th>
                                    <th className="px-3 py-2">{t('columns.status')}</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {fonts.map((font) => (
                                    <ThemeFontRow key={font.id} font={font} onEditAction={openDrawer} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Drawer */}
            {drawer.open && <ThemeFontDrawer key={drawer.token} font={drawer.font} onCloseAction={closeDrawer} />}
        </div>
    );
}

function ThemeFontRow({ font, onEditAction }: { font: AdminThemeFontDto; onEditAction: (font: AdminThemeFontDto) => void }) {
    const t = useTranslations('AdminPage.themeFonts');
    const status = themeFontStatus(font);
    const face = font.url ? { key: font.key, fallback: font.fallback, url: font.url } : null;

    function handleEdit() {
        onEditAction(font);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0">
            {/* Sample */}
            <td className="px-3 py-2.5">
                <ThemeFontFace font={face} />
                <button
                    type="button"
                    onClick={handleEdit}
                    className="text-left text-lg leading-tight text-ink hover:text-primary-dark"
                    style={{ fontFamily: face ? themeFontFamily(face) : font.fallback }}
                >
                    {font.familyName}
                </button>
            </td>
            {/* Key */}
            <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">{font.key}</td>
            {/* Fallback */}
            <td className="px-3 py-2.5 text-sm text-ink-muted">{t(FALLBACK_LABEL[font.fallback])}</td>
            {/* Presets */}
            <td className="px-3 py-2.5 text-sm text-ink tabular-nums">{font.presetCount}</td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', STATUS_PILL[status])}>
                    {t(`status.${status}`)}
                </span>
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={t('edit', { name: font.familyName })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
