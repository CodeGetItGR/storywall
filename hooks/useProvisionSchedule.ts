'use client';

import { useState } from 'react';

import type { AdminProvisionScheduleItem } from '@/lib/api/types';
import {
    canSaveScheduleDraft,
    EMPTY_SCHEDULE_DRAFT,
    isScheduleEndBeforeStart,
    PROVISION_SCHEDULE_MAX,
    type ProvisionScheduleDraft,
    scheduleItemToRequest,
    upsertScheduleItem,
} from '@/lib/provisionSchedule';

// The schedule items a provisioned event starts with, edited one at a time in a dialog.
// `allowsVenue`: the event type has a reception venue session (weddings, baptisms).
export function useProvisionSchedule(allowsVenue: boolean) {
    const [items, setItems] = useState<ProvisionScheduleDraft[]>([]);
    // null: closed; 'new': adding; a number: editing that item.
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [draft, setDraft] = useState<ProvisionScheduleDraft>(EMPTY_SCHEDULE_DRAFT);

    function openNew() {
        setDraft(EMPTY_SCHEDULE_DRAFT);
        setEditing('new');
    }

    function openItem(index: number) {
        setDraft(items[index] ?? EMPTY_SCHEDULE_DRAFT);
        setEditing(index);
    }

    function close() {
        setEditing(null);
    }

    function updateDraft(field: keyof ProvisionScheduleDraft, value: string | boolean) {
        setDraft((current) => ({ ...current, [field]: value }));
    }

    function save() {
        if (editing === null || !canSaveScheduleDraft(draft)) return;
        setItems((current) => upsertScheduleItem(current, editing === 'new' ? null : editing, draft));
        setEditing(null);
    }

    function remove() {
        if (typeof editing !== 'number') return;
        setItems((current) => current.filter((_, at) => at !== editing));
        setEditing(null);
    }

    function reset() {
        setItems([]);
        setEditing(null);
    }

    return {
        items,
        allowsVenue,
        canAdd: items.length < PROVISION_SCHEDULE_MAX,
        isOpen: editing !== null,
        isNew: editing === 'new',
        draft,
        endBeforeStart: isScheduleEndBeforeStart(draft),
        canSave: canSaveScheduleDraft(draft),
        openNew,
        openItem,
        close,
        updateDraft,
        save,
        remove,
        reset,
        toRequest: (): AdminProvisionScheduleItem[] => items.map((item) => scheduleItemToRequest(item, allowsVenue)),
    };
}

export type ProvisionScheduleState = ReturnType<typeof useProvisionSchedule>;
