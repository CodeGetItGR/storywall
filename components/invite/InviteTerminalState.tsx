import { HeartCrack } from 'lucide-react';
import type { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';

export function InviteTerminalState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
            <Logo direction="col" className="mb-8" />
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand">
                <HeartCrack className="h-7 w-7 text-white" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-balance text-ink lg:text-3xl">{title}</h1>
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
            {action && <div className="mt-8">{action}</div>}
        </div>
    );
}
