'use client';

import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { AdminSortableList } from '@/components/admin/AdminSortableList';
import { AdminSortableRow } from '@/components/admin/AdminSortableRow';
import { TextStyleDrawer } from '@/components/admin/textStyles/TextStyleDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTextStylesPanel } from '@/hooks/useTextStylesPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { TextStylePresetDto } from '@/lib/api/types';
import { fontLabel } from '@/lib/invitation/textEditing';
import type { MoveDirection } from '@/lib/sortOrder';

const PILL = 'rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-status-neutral';
const presetIdOf = (preset: TextStylePresetDto) => preset.id;

// The feed's Style presets: one list for every event, in the order hosts see them in the Style menu.
export function TextStylesPanel() {
    const t = useTranslations('AdminPage.textStyles');
    const tAdmin = useTranslations('AdminPage');
    const panel = useTextStylesPanel();
    const { query, rows, move, drawer } = panel;

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                </div>
                <button
                    type="button"
                    onClick={panel.openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('create')}
                </button>
            </header>

            {/* Styles */}
            <section className="rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {query.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {move.error && <p className="px-4 pt-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(move.error)}`)}</p>}
                {!query.isLoading && !query.error && rows.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>
                )}
                {!query.isLoading && !query.error && rows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-160 text-left">
                            <thead>
                                <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="w-0 px-3 py-2" />
                                    <th className="px-3 py-2">{t('columns.name')}</th>
                                    <th className="px-3 py-2">{t('columns.font')}</th>
                                    <th className="px-3 py-2">{t('columns.size')}</th>
                                    <th className="px-3 py-2">{t('columns.look')}</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                <AdminSortableList ids={rows.map(presetIdOf)} disabled={move.isPending} onReorderAction={move.reorder}>
                                    {rows.map((preset, index) => (
                                        <TextStyleRow
                                            key={preset.id}
                                            preset={preset}
                                            isFirst={index === 0}
                                            isLast={index === rows.length - 1}
                                            moveDisabled={move.isPending}
                                            onMoveAction={move.move}
                                            onEditAction={panel.openEdit}
                                        />
                                    ))}
                                </AdminSortableList>
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Drawer */}
            {drawer.open && (
                <TextStyleDrawer
                    key={drawer.token}
                    preset={drawer.preset}
                    isSaving={panel.isSaving}
                    isDeleting={panel.isDeleting}
                    error={panel.drawerError}
                    onSaveAction={panel.saveDrawer}
                    onDeleteAction={panel.deleteDrawer}
                    onCloseAction={panel.closeDrawer}
                />
            )}
        </div>
    );
}

function TextStyleRow({
    preset,
    isFirst,
    isLast,
    moveDisabled,
    onMoveAction,
    onEditAction,
}: {
    preset: TextStylePresetDto;
    isFirst: boolean;
    isLast: boolean;
    moveDisabled: boolean;
    onMoveAction: (id: string, direction: MoveDirection) => void;
    onEditAction: (preset: TextStylePresetDto) => void;
}) {
    const t = useTranslations('AdminPage.textStyles');
    const tAdmin = useTranslations('AdminPage');

    function handleEdit() {
        onEditAction(preset);
    }

    return (
        <AdminSortableRow id={preset.id} name={preset.nameEn} className="border-b border-border/70 last:border-b-0">
            {/* Order */}
            <td className="px-3 py-2.5">
                <AdminOrderArrows id={preset.id} name={preset.nameEn} isFirst={isFirst} isLast={isLast} disabled={moveDisabled} onMoveAction={onMoveAction} />
            </td>
            {/* Name */}
            <td className="px-3 py-2.5">
                <button type="button" onClick={handleEdit} className="text-left font-semibold text-ink hover:text-primary-dark">
                    {preset.nameEn}
                </button>
                <p className="text-xs text-ink-muted">{preset.nameEl}</p>
            </td>
            {/* Font */}
            <td className="px-3 py-2.5 text-sm text-ink">{fontLabel(preset.font)}</td>
            {/* Size */}
            <td className="px-3 py-2.5 font-mono text-[12px] text-ink tabular-nums">{preset.size}</td>
            {/* Look */}
            <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                    {preset.weight === 'BOLD' && <span className={PILL}>{t('weight.bold')}</span>}
                    {preset.italic && <span className={PILL}>{t('fields.italic')}</span>}
                    {preset.uppercase && <span className={PILL}>{t('case.upper')}</span>}
                    {preset.letterSpacing !== 0 && (
                        <span className={`${PILL} font-mono`}>{`${preset.letterSpacing > 0 ? '+' : ''}${preset.letterSpacing}px`}</span>
                    )}
                </div>
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={tAdmin('themeFonts.edit', { name: preset.nameEn })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
            </td>
        </AdminSortableRow>
    );
}
