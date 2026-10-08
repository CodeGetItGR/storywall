'use client';

import { Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { LandingCategoryDrawer } from '@/components/admin/landingCategories/LandingCategoryDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminLandingCategories, useLandingCategoryMove } from '@/hooks/useAdminLandingCategories';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminLandingCategoryDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { landingCategoryWarnings } from '@/lib/landingCategoryWarnings';
import { bySortOrder } from '@/lib/sortOrder';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold';
const NO_EVENT_TYPES: PlatformEventTypeResponseDto[] = [];

// token: which opening this is. The drawer is keyed on it, so each opening starts from the
// category's saved values.
type DrawerState = { open: boolean; category: AdminLandingCategoryDto | null; token: number };

// The landing page's pricing tabs (spec 2026-10-06-landing-categories-design.md §6). Warnings run
// the landing's own builder on the public config, so they say what the landing actually shows.
export function LandingCategoriesPanel() {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const categoriesQuery = useAdminLandingCategories();
    const eventTypesQuery = useAdminPlatformEventTypes();
    const config = useAppConfig();
    const categories = useMemo(() => [...(categoriesQuery.data ?? [])].sort(bySortOrder), [categoriesQuery.data]);
    const eventTypes = useMemo(() => [...(eventTypesQuery.data ?? NO_EVENT_TYPES)].sort(bySortOrder), [eventTypesQuery.data]);
    const move = useLandingCategoryMove(categories);
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, category: null, token: 0 });
    const nextToken = useRef(0);

    const assigned = new Set(categories.flatMap((category) => category.eventTypeKeys));
    const unassigned = eventTypes.filter((type) => !assigned.has(type.eventTypeKey));

    function eventTypeName(key: string) {
        return localizedText(eventTypes.find((type) => type.eventTypeKey === key)?.name, key);
    }

    function openDrawer(category: AdminLandingCategoryDto | null) {
        nextToken.current += 1;
        setDrawer({ open: true, category, token: nextToken.current });
    }

    function handleCreateClick() {
        openDrawer(null);
    }

    function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
        const found = categories.find((item) => item.id === event.currentTarget.dataset.categoryId);
        if (found) openDrawer(found);
    }

    const closeDrawer = useCallback(() => {
        setDrawer((current) => ({ ...current, open: false }));
    }, []);

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 rounded-lg border border-status-warn-wash bg-status-warn-wash/40 px-4 py-3 text-sm leading-6 text-status-warn">
                    {t('landingCategories.notice')}
                </p>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('landingCategories.create')}
                </button>
            </div>

            <section className="rounded-xl border border-border bg-card">
                {categoriesQuery.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {categoriesQuery.error && (
                    <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(categoriesQuery.error)}`)}</p>
                )}
                {move.error && <p className="px-4 pt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(move.error)}`)}</p>}
                {!categoriesQuery.isLoading && !categoriesQuery.error && categories.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('landingCategories.empty')}</p>
                )}

                {categories.length > 0 && (
                    <ul className="divide-y divide-border">
                        {categories.map((category, index) => {
                            // Nothing to warn about until the public config is in: an empty one would
                            // read as "no enabled type" on every row.
                            const warnings = config.data
                                ? landingCategoryWarnings(category, config.data.planTiers, config.data.eventTypes, config.data.memberRolesByEventType)
                                : null;
                            const name = localizedText(category.name);
                            return (
                                <li key={category.id} className="flex items-start gap-3 px-4 py-3 hover:bg-canvas/60">
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span data-testid="landing-category-name" className="truncate font-semibold text-ink">
                                                {name}
                                            </span>
                                            {category.isDefault && (
                                                <span className={`${PILL} bg-status-good-wash text-status-good`}>
                                                    {t('landingCategories.defaultPill')}
                                                </span>
                                            )}
                                            {!category.isVisible && (
                                                <span className={`${PILL} bg-status-neutral-wash text-status-neutral`}>
                                                    {t('landingCategories.hiddenPill')}
                                                </span>
                                            )}
                                        </div>
                                        {category.eventTypeKeys.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {category.eventTypeKeys.map((key) => (
                                                    <span key={key} className="rounded-md border border-border px-2 py-0.5 text-xs text-ink-muted">
                                                        {eventTypeName(key)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {warnings?.noEnabledType && (
                                            <p className="text-xs text-status-warn">{t('landingCategories.warnNoEnabledType')}</p>
                                        )}
                                        {warnings && !warnings.noEnabledType && warnings.noVisiblePlan && (
                                            <p className="text-xs text-status-warn">{t('landingCategories.warnNoVisiblePlan')}</p>
                                        )}
                                        {warnings?.driftedGroups.map((group) => (
                                            <p key={group.sharedGroupKey} className="text-xs text-status-warn">
                                                {t('landingCategories.warnDrifted', {
                                                    plans: group.planCodes.join(', '),
                                                    fields: group.differingFields
                                                        .map((field) => t(`landingCategories.driftFields.${field}`))
                                                        .join(', '),
                                                })}
                                            </p>
                                        ))}
                                    </div>
                                    <AdminOrderArrows
                                        id={category.id}
                                        name={name}
                                        isFirst={index === 0}
                                        isLast={index === categories.length - 1}
                                        disabled={move.isPending}
                                        onMoveAction={move.move}
                                    />
                                    <button
                                        type="button"
                                        data-category-id={category.id}
                                        onClick={handleEditClick}
                                        aria-label={`${t('eventTypes.edit')} ${name}`}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {unassigned.length > 0 && (
                <section className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{t('landingCategories.unassigned')}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {unassigned.map((type) => (
                            <span
                                key={type.eventTypeKey}
                                className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-ink-muted"
                            >
                                {localizedText(type.name, type.eventTypeKey)}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <LandingCategoryDrawer
                key={drawer.token}
                open={drawer.open}
                category={drawer.category}
                categories={categories}
                eventTypes={eventTypes}
                onCloseAction={closeDrawer}
            />
        </section>
    );
}
