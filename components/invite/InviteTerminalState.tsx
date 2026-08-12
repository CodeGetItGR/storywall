import { HeartCrack } from 'lucide-react';
import type { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';

export function InviteTerminalState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16">
            <Logo direction="col" className="mb-8" />
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
                <HeartCrack className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">{title}</h1>
            <p className="text-sm text-ink-muted max-w-sm leading-relaxed">{description}</p>
            {action && <div className="mt-8">{action}</div>}
        </div>
    );
}
