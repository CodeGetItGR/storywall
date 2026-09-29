'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DemoAddGuestModal } from '@/components/demo/DemoAddGuestModal';
import { useDemoActAs } from '@/hooks/useDemoActAs';

// Shown to an admin filling a demo event: choose who new content is posted as.
export function DemoActAsBar({ eventId }: { eventId: string }) {
    const t = useTranslations('DemoActAs');
    const actAs = useDemoActAs(eventId);

    return (
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-ink px-4 py-2 text-sm text-white">
            {/* Posting as */}
            <label className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 font-semibold">{t('postingAs')}</span>
                <select
                    value={actAs.selectedId ?? ''}
                    onChange={actAs.handleSelectChange}
                    className="min-h-9 max-w-64 min-w-0 flex-1 rounded-md bg-white/10 px-2 text-white [&>option]:text-ink"
                >
                    <option value="">{t('host')}</option>
                    {actAs.guests.map((guest) => (
                        <option key={guest.id} value={guest.id}>
                            {guest.displayName}
                        </option>
                    ))}
                </select>
            </label>

            {/* Add guest */}
            <button
                type="button"
                onClick={actAs.openAddDialog}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 font-semibold hover:bg-white/20"
            >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t('addGuest')}
            </button>

            <DemoAddGuestModal
                open={actAs.addDialog.open}
                isAdding={actAs.isAdding}
                error={actAs.addError}
                onCloseAction={actAs.addDialog.toggle}
                onSubmitAction={actAs.handleAddGuest}
            />
        </div>
    );
}
