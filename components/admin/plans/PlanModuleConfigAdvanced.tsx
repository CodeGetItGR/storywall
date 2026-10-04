'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { PlanModuleConfigJsonField } from '@/components/admin/plans/PlanModuleConfigJsonField';
import { useDisclosure } from '@/hooks/useDisclosure';
import { cn } from '@/lib/utils';

// Settings the FE has no control for yet, as raw JSON, kept out of the way.
// Opens by itself when the JSON is invalid so the error is never hidden.
export function PlanModuleConfigAdvanced({
    value,
    error,
    onChangeAction,
}: {
    value: string;
    error: string | null;
    onChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');
    const { open, toggle } = useDisclosure(false);
    const panelId = useId();
    const expanded = open || Boolean(error);

    return (
        <div>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
            >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                {t('advanced')}
            </button>
            {expanded && (
                <div id={panelId} className="mt-2">
                    <PlanModuleConfigJsonField value={value} error={error} onChangeAction={onChangeAction} />
                </div>
            )}
        </div>
    );
}
