'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleMapPreview } from '@/app/(app)/(event)/tools/schedule/components/ScheduleMapPreview';
import { Modal } from '@/components/ui/modal';

interface EventLocationModalProps {
    open: boolean;
    onClose: () => void;
    name: string | null;
    address: string | null;
    mapsUrl: string | null;
}

export function EventLocationModal({ open, onClose, name, address, mapsUrl }: EventLocationModalProps) {
    const t = useTranslations('EventLocationModal');
    const heading = name ?? t('title');

    return (
        <Modal open={open} onClose={onClose} size="sm" closeLabel={t('close')} ariaLabel={t('title')}>
            <Modal.Body className="flex flex-col gap-4 px-4 pb-5 pt-12 sm:px-5">
                {/* Details */}
                <div className="flex items-start gap-3 pr-8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-dark">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-semibold text-ink">{heading}</p>
                        {address && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{address}</p>}
                    </div>
                </div>

                {/* Map */}
                {mapsUrl && (
                    <ScheduleMapPreview
                        mapsUrl={mapsUrl}
                        title={t('openMap', { title: heading })}
                        openLabel={t('openInGoogleMaps')}
                        previewLabel={t('mapPreview')}
                        unavailableLabel={t('mapPreviewUnavailable')}
                    />
                )}
            </Modal.Body>
        </Modal>
    );
}
