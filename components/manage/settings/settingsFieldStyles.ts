// Shared looks for the Settings part editors (S2): white fields with a thin border, so they read on
// the panel's muted background as well as on the white sheet.
export const settingsInputClass =
    'w-full rounded-[14px] border border-border bg-background px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

export const settingsLabelClass = 'text-[13px] font-semibold normal-case tracking-normal text-ink-muted';

export const settingsHintClass = 'text-xs leading-relaxed text-ink-muted';
