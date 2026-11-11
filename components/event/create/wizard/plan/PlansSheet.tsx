'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useId } from 'react';

import { Modal } from '@/components/ui/modal';
import { type PlansSheetRow, useCreateEventPlansSheet } from '@/hooks/useCreateEventPlansSheet';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import { cn } from '@/lib/utils';

// "All plans": every full plan with what it adds and its starting price, then the lite ones.
// A bottom sheet on phones, the app's sheet card (narrowed to the wizard) on desktop.
export function PlansSheet() {
    const t = useTranslations('CreateEventPage.wizard');
    const tPricing = useTranslations('LandingPage.pricing');
    const tDurations = useTranslations('Durations');
    const titleId = useId();
    const sheet = useCreateEventPlansSheet();
    const codes = [...sheet.fullRows, ...sheet.liteRows].map((row) => row.code);
    const onKeyDown = useRadioGroupKeys(codes, sheet.pending, sheet.setPending);

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) sheet.setPending(radioId);
    }

    const row = (plan: PlansSheetRow, lite: boolean) => {
        const selected = plan.code === sheet.pending;
        return (
            <button
                key={plan.code}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-radio-id={plan.code}
                onClick={handleClick}
                className={cn(
                    'flex items-center gap-3.5 text-left text-ink focus-ring',
                    lite ? 'h-15 px-4' : 'rounded-[22px] p-4',
                    !lite && (selected ? 'border-2 border-ink' : 'border-[1.5px] border-[#ece3da]'),
                )}
            >
                {/* Radio */}
                <span
                    aria-hidden="true"
                    className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', selected ? 'bg-ink' : 'border-2 border-[#cdb9a4]')}
                >
                    {selected && <Check className="size-3.5 text-white" strokeWidth={3.2} />}
                </span>
                {/* Plan */}
                <span className="flex min-w-0 grow flex-col gap-0.75">
                    <span className={cn('font-extrabold', lite ? 'text-[15px]' : 'text-[17px] tracking-[0.06em]')}>{plan.name}</span>
                    {plan.summary && <span className="text-[13px] text-[#6f6257]">{plan.summary}</span>}
                    {plan.line && <span className="text-[13px] text-[#6f6257]">{plan.line}</span>}
                    {lite && <span className="text-xs text-[#6f6257]">{tDurations('months', { count: plan.months })}</span>}
                </span>
                {/* Price */}
                <span className={cn('shrink-0', lite ? 'text-[15px] font-bold' : 'font-editorial text-[22px]')}>{plan.price}</span>
            </button>
        );
    };

    return (
        <Modal
            open={sheet.isOpen}
            onClose={sheet.close}
            variant="sheet"
            dismissOnBack={false}
            showCloseButton={false}
            labelledBy={titleId}
            className="bg-white sm:max-w-104"
        >
            <div className="flex max-h-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pt-3 pr-4 pl-5">
                    <h2 id={titleId} className="font-editorial text-2xl text-ink">
                        {t('plans.title')}
                    </h2>
                    <button
                        type="button"
                        aria-label={t('close')}
                        onClick={sheet.close}
                        className="flex size-11 items-center justify-center rounded-full bg-[#fbf1e6] focus-ring"
                    >
                        <X className="size-4.5 text-ink" aria-hidden="true" />
                    </button>
                </div>

                {/* Plans */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-2" role="radiogroup" aria-labelledby={titleId} onKeyDown={onKeyDown}>
                    <div className="flex flex-col gap-2.5">{sheet.fullRows.map((plan) => row(plan, false))}</div>

                    {/* Lite plans */}
                    {sheet.liteRows.length > 0 && (
                        <div className="flex flex-col gap-2.5 pt-6">
                            <span className="text-[15px] font-bold text-ink">{tPricing('liteHeading')}</span>
                            <div className="flex flex-col divide-y divide-[#f0e7de] overflow-hidden rounded-[22px] border-[1.5px] border-[#ece3da]">
                                {sheet.liteRows.map((plan) => row(plan, true))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Choose */}
                <div className="px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={sheet.choose}
                        className="h-14 w-full rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink focus-ring"
                    >
                        {t('plans.choose', { plan: sheet.pendingName })}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
