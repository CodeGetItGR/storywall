import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ModuleNoticeTone = 'muted' | 'info' | 'warning';

interface ModuleNoticeProps {
    tone?: ModuleNoticeTone;
    children: ReactNode;
}

const toneClassName: Record<ModuleNoticeTone, string> = {
    muted: 'bg-surface-muted text-ink-muted',
    info: 'border border-sky-100 bg-sky-50 text-sky-700',
    warning: 'border border-amber-100 bg-amber-50 text-amber-700',
};

export function ModuleNotice({ tone = 'muted', children }: ModuleNoticeProps) {
    return <div className={cn('mb-4 rounded-2xl px-4 py-3 text-sm leading-relaxed', toneClassName[tone])}>{children}</div>;
}
