'use client';

import { Check, Search } from 'lucide-react';
import type { ChangeEventHandler, MouseEventHandler, ReactNode } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<Visibility, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

export function PlanMatrixToolbar({
    title,
    subtitle,
    search,
    searchLabel,
    pendingCount,
    discardLabel,
    reviewLabel,
    onSearchChangeAction,
    onDiscardAction,
    onReviewAction,
}: {
    title: string;
    subtitle: string;
    search: string;
    searchLabel: string;
    pendingCount: number;
    discardLabel: string;
    reviewLabel: string;
    onSearchChangeAction: ChangeEventHandler<HTMLInputElement>;
    onDiscardAction: MouseEventHandler<HTMLButtonElement>;
    onReviewAction: MouseEventHandler<HTMLButtonElement>;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
            <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <div className="relative min-w-52 flex-1 sm:w-56 sm:flex-none">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                        value={search}
                        onChange={onSearchChangeAction}
                        placeholder={searchLabel}
                        aria-label={searchLabel}
                        className={adminInputClass('w-full pl-8')}
                    />
                </div>
                {pendingCount > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={onDiscardAction}
                            className="min-h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-card"
                        >
                            {discardLabel}
                        </button>
                        <button type="button" onClick={onReviewAction} className="min-h-9 rounded-md bg-ink px-3.5 text-sm font-semibold text-white">
                            {reviewLabel}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export function PlanMatrixPlanCell({ plan, statusLabel }: { plan: PlanTierResponseDto; statusLabel: string }) {
    const status = visibilityOf(plan);
    return (
        <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left" scope="row">
            <p className="font-semibold leading-5 text-ink">{plan.name}</p>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-faint">{plan.code}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', STATUS_PILL[status])}>{statusLabel}</span>
            </div>
        </th>
    );
}

export function PlanMatrixCheckbox({
    checked,
    disabled,
    label,
    onClickAction,
    children,
    ...data
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onClickAction: MouseEventHandler<HTMLButtonElement>;
    children?: ReactNode;
    'data-plan-id': string;
    'data-assignment-key'?: string;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onClickAction}
            {...data}
            className={cn(
                'mx-auto flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary/30',
                checked
                    ? 'border-primary/30 bg-primary-light text-primary-dark'
                    : 'border-border bg-card text-transparent hover:border-ink-faint hover:bg-canvas',
                disabled && 'cursor-default opacity-45'
            )}
        >
            {checked && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {children}
        </button>
    );
}
