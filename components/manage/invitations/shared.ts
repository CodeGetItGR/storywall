import type { useTranslations } from 'next-intl';

export type ManageTranslations = ReturnType<typeof useTranslations>;
export type InvitationPanel = 'invites' | 'qr';

export const formPanelClass = 'mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm';
export const fieldLabelClass = 'flex flex-col gap-1.5';
export const fieldTextClass = 'text-[11px] font-semibold uppercase tracking-wide text-ink-muted';
export const fieldControlClass =
    'rounded-xl border border-transparent bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/30 focus:bg-card focus:ring-2 focus:ring-primary/20';
