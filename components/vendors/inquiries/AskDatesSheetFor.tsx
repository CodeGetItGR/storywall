'use client';

import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';
import type { useAskDates } from '@/hooks/useAskDates';

// The ask sheet wired to useAskDates, shown while a partner is picked.
export function AskDatesSheetFor({ ask }: { ask: ReturnType<typeof useAskDates> }) {
    if (!ask.target) return null;
    return (
        <AskDatesSheet
            name={ask.target.name}
            date={ask.date}
            phone={ask.phone}
            email={ask.email}
            note={ask.note}
            consent={ask.consent}
            dateBounds={ask.dateBounds}
            dateError={ask.dateError}
            contactError={ask.contactError}
            sendError={ask.sendError}
            sent={ask.sent}
            isSending={ask.isSending}
            canSend={ask.canSend}
            onDateChangeAction={ask.setDate}
            onPhoneChangeAction={ask.setPhone}
            onEmailChangeAction={ask.setEmail}
            onNoteChangeAction={ask.setNote}
            onConsentChangeAction={ask.setConsent}
            onSubmitAction={ask.submit}
            onCloseAction={ask.close}
        />
    );
}
