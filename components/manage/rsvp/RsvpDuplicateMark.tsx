'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { RosterEntry } from '@/lib/rsvpGuests';

type RsvpDuplicateMarkProps = {
    entry: RosterEntry;
    // Keep and Remove show only while the event can still be changed.
    canAct: boolean;
    keeping: boolean;
    onKeepAction: (entry: RosterEntry) => void;
    onRemoveAction: (entry: RosterEntry) => void;
};

// A reply whose phone matches another reply on the event, and the host's two answers to it.
export function RsvpDuplicateMark({ entry, canAct, keeping, onKeepAction, onRemoveAction }: RsvpDuplicateMarkProps) {
    const t = useTranslations('ManagePage');

    function handleKeep() {
        onKeepAction(entry);
    }

    function handleRemove() {
        onRemoveAction(entry);
    }

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Mark */}
            <span
                title={t('rsvpDuplicate.hint')}
                className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-amber-700"
            >
                <Copy aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                {t('rsvpDuplicate.label')}
            </span>

            {/* Actions */}
            {canAct && (
                <>
                    <Button type="button" variant="outline" size="sm" disabled={keeping} onClick={handleKeep}>
                        {t('rsvpDuplicate.keep')}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" disabled={keeping} onClick={handleRemove}>
                        {t('members.remove')}
                    </Button>
                </>
            )}
        </div>
    );
}
