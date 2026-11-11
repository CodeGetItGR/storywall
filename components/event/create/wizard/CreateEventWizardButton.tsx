'use client';

import { Loader2, Lock } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    label: string;
    pending?: boolean;
    lock?: boolean;
};

// The wizard's full-width gradient button with an ink label (6.3:1 and up; white fails).
export function CreateEventWizardButton({ label, pending = false, lock = false, type = 'button', ...rest }: Props) {
    return (
        <button
            type={type}
            {...rest}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
        >
            {pending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
                lock && <Lock aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
            )}
            {label}
        </button>
    );
}
