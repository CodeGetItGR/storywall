'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VendorRow } from '@/components/vendors/manage/VendorRow';
import { VendorSeatsBar } from '@/components/vendors/manage/VendorSeatsBar';
import { VendorsEmpty } from '@/components/vendors/manage/VendorsEmpty';
import type { VendorCapabilityItem } from '@/hooks/useVendorCapabilities';
import type { VendorScene } from '@/hooks/useVendorScene';
import type { VendorRowDto } from '@/lib/api/types';

type Props = {
    vendors: VendorRowDto[];
    listError: string | null;
    patchingVendorId: string | null;
    seats: { seatsLabel: string | null; seatsSpoken: string | null; percent: number };
    // Shown instead of the Invite button: the event is full, or has no invite links yet.
    notice: string | null;
    // Shown while no vendor has joined: the picture and what each allowed type can do.
    scene: VendorScene;
    capabilities: VendorCapabilityItem[];
    onInviteAction: () => void;
    onOpenAction: (vendorId: string) => void;
    onToggleHiddenAction: (vendorId: string) => void;
    onRemoveAction: (vendorId: string) => void;
};

// V1 "Joined": the heading with the seats bar and the Invite button, then the joined vendors.
export function VendorsJoined({
    vendors,
    listError,
    patchingVendorId,
    seats,
    notice,
    scene,
    capabilities,
    onInviteAction,
    onOpenAction,
    onToggleHiddenAction,
    onRemoveAction,
}: Props) {
    const t = useTranslations('Vendors');

    return (
        <section aria-labelledby="vendor-joined-title" className="flex min-w-0 flex-col gap-2.5">
            {/* Header */}
            <div className="flex items-center gap-3.5">
                <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 id="vendor-joined-title" className="text-[17px] font-bold text-ink">
                        {t('manage.joinedTitle')}
                    </h2>
                    {/* Seats */}
                    {seats.seatsLabel && seats.seatsSpoken && (
                        <VendorSeatsBar label={seats.seatsLabel} spoken={seats.seatsSpoken} percent={seats.percent} />
                    )}
                </div>
                {!notice && (
                    <button
                        type="button"
                        onClick={onInviteAction}
                        className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold whitespace-nowrap text-white transition-opacity bg-gradient-brand hover:opacity-90 focus-ring"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        {t('manage.invite')}
                    </button>
                )}
            </div>

            {/* Notice */}
            {notice && <p className="text-sm leading-relaxed text-ink-muted">{notice}</p>}

            {/* Error */}
            {listError && (
                <p role="alert" className="text-sm text-destructive">
                    {listError}
                </p>
            )}

            {/* Rows */}
            {vendors.length === 0 ? (
                <VendorsEmpty scene={scene} items={capabilities} />
            ) : (
                <ul className="flex flex-col gap-1">
                    {vendors.map((vendor) => (
                        <VendorRow
                            key={vendor.id}
                            vendor={vendor}
                            isPatching={patchingVendorId === vendor.id}
                            onOpenAction={onOpenAction}
                            onToggleHiddenAction={onToggleHiddenAction}
                            onRemoveAction={onRemoveAction}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
