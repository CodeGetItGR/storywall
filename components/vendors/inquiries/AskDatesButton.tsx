'use client';

import { CalendarCheck, CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { InquiryStateDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Same height, rounding and type as the vendor card's other actions (VendorCardAction).
const SHAPE = 'h-9 gap-1.5 rounded-full px-3 text-sm font-semibold';

// "Ask about my date" on a partner's card. Once sent it stays, disabled, so the guest knows they already asked.
export function AskDatesButton({ state, onAskAction, className }: { state: InquiryStateDto; onAskAction: () => void; className?: string }) {
    const t = useTranslations('Vendors.inquiry');

    return state.canAsk ? (
        <Button type="button" onClick={onAskAction} className={cn(SHAPE, className)}>
            <CalendarDays aria-hidden="true" />
            {t('ask')}
        </Button>
    ) : (
        <Button type="button" variant="outline" disabled className={cn(SHAPE, className)}>
            <CalendarCheck aria-hidden="true" />
            {t('alreadySent')}
        </Button>
    );
}
