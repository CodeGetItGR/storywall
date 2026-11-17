'use client';

import type { ReactNode } from 'react';

import { useCopyText } from '@/hooks/useCopyText';
import { useFitTextWidth } from '@/hooks/useFitTextWidth';

// Keeps the IBAN on one line, whatever its length and the screen's width.
export function GiftIbanBox({ children }: { children: ReactNode }) {
    const ref = useFitTextWidth<HTMLDivElement>();

    return (
        <div className="iban" ref={ref}>
            {children}
        </div>
    );
}

type GiftCopyButtonProps = {
    iban: string;
    copyLabel: string;
    copiedLabel: string;
};

export function GiftCopyButton({ iban, copyLabel, copiedLabel }: GiftCopyButtonProps) {
    const { copied, copy } = useCopyText(iban);

    return (
        <button type="button" className="gift-copy-btn" onClick={copy}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="8" y="8" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
    );
}
