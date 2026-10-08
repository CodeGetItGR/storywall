'use client';

import { CirclePause, CirclePlay, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCollaboratorBrandingToggle } from '@/hooks/useCollaboratorBranding';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const SECONDARY_BUTTON =
    'inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink';

function DetailItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
    const t = useTranslations('AdminPage.collaborations.feedCard');

    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-[13px] font-medium text-ink-muted">{label}</dt>
            <dd className="mt-1 text-sm break-words">
                {value === null ? (
                    <span className="font-semibold text-status-warn">{t('missingValue')}</span>
                ) : (
                    <span className="font-semibold text-ink">{value}</span>
                )}
            </dd>
        </div>
    );
}

function BrandingImage({ label, src, aspect }: { label: string; src: string | null; aspect: 'square' | 'video' }) {
    const t = useTranslations('AdminPage.collaborations.feedCard');

    return (
        <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink-muted">{label}</p>
            {src ? (
                <div
                    className={cn(
                        'relative mt-1 overflow-hidden rounded-md border border-border bg-canvas',
                        aspect === 'square' ? 'h-16 w-16' : 'aspect-video w-full max-w-60',
                    )}
                >
                    <ProtectedImage src={src} alt="" fill sizes="240px" className={aspect === 'square' ? 'object-contain' : 'object-cover'} />
                </div>
            ) : (
                <p className="mt-1 text-sm font-semibold text-status-warn">{t('missingValue')}</p>
            )}
        </div>
    );
}

// The partner's card in event feeds: what it says and whether it is on. Every field is needed to turn it on.
export function CollaboratorFeedCard({ collaborator, onEditAction }: { collaborator: CollaboratorResponseDto; onEditAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations.feedCard');
    const tAdmin = useTranslations('AdminPage');
    const toggle = useCollaboratorBrandingToggle(collaborator);
    const enabled = collaborator.brandingEnabled;
    const missingWebsite = collaborator.missingBrandingFields.includes('website_url');

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            enabled ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
                        )}
                    >
                        <span className={cn('h-1.5 w-1.5 rounded-full', enabled ? 'bg-status-good' : 'bg-status-neutral')} />
                        {enabled ? t('status.on') : t('status.off')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={toggle.open} className={SECONDARY_BUTTON}>
                        {enabled ? <CirclePause className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
                        {enabled ? t('disable.action') : t('enable.action')}
                    </button>
                    <button type="button" onClick={onEditAction} className={SECONDARY_BUTTON}>
                        <Pencil className="h-4 w-4" />
                        {t('edit')}
                    </button>
                </div>
            </div>

            {/* Website: kept in business details, but the card links to it */}
            {missingWebsite && <p className="text-sm text-status-warn">{t('missingWebsite')}</p>}

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Text */}
                <PlatformMetricGroup title={t('groups.text')} titleAs="h4">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <DetailItem label={t('fields.display_name')} value={collaborator.brandingDisplayName} />
                        <DetailItem label={t('fields.role')} value={collaborator.brandingRole && t(`roles.${collaborator.brandingRole}`)} />
                        <DetailItem label={t('fields.tagline_el')} value={collaborator.brandingTaglineEl} />
                        <DetailItem label={t('fields.tagline_en')} value={collaborator.brandingTaglineEn} />
                        <DetailItem label={t('fields.services_el')} value={collaborator.brandingServicesEl} />
                        <DetailItem label={t('fields.services_en')} value={collaborator.brandingServicesEn} />
                    </dl>
                </PlatformMetricGroup>

                {/* Images */}
                <PlatformMetricGroup title={t('groups.images')} titleAs="h4">
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                        <BrandingImage label={t('fields.logo')} src={collaborator.brandingLogoUrl} aspect="square" />
                        <BrandingImage label={t('fields.cover')} src={collaborator.brandingCoverUrl} aspect="video" />
                    </div>
                </PlatformMetricGroup>
            </div>

            <ConfirmActionModal
                open={toggle.confirming}
                onCloseAction={toggle.close}
                title={enabled ? t('disable.title') : t('enable.title')}
                body={
                    <>
                        {enabled ? t('disable.body') : t('enable.body')}
                        {toggle.error && (
                            <span className="mt-2 block text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(toggle.error)}`)}</span>
                        )}
                    </>
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={enabled ? t('disable.action') : t('enable.action')}
                tone={enabled ? 'danger' : 'default'}
                isConfirming={toggle.isSaving}
                onConfirmAction={toggle.confirm}
            />
        </section>
    );
}
