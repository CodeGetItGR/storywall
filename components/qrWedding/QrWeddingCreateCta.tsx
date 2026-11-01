import type { ReactNode } from 'react';

import { QR_WEDDING_CREATE_HREF } from '@/lib/qrWeddingPage';

// The gradient "Create your StoryWall" pill with its round arrow, in the hero and under the comparison.
export function QrWeddingCreateCta({ children }: { children: ReactNode }) {
    return (
        <a
            className="inline-flex min-h-18.5 items-center justify-between gap-4 rounded-full bg-[linear-gradient(100deg,#ff6f93_0%,#ff936a_52%,#ffd05b_100%)] py-2.5 pr-2.75 pl-7 [font-family:var(--editorial)] text-[19px] leading-[1.05] font-normal text-white shadow-[0_18px_38px_-16px_rgba(255,111,147,.55)] max-[768px]:min-h-14.5 max-[768px]:max-w-full max-[768px]:gap-3 max-[768px]:py-1.75 max-[768px]:pr-2 max-[768px]:pl-5 max-[768px]:text-base"
            href={QR_WEDDING_CREATE_HREF}
        >
            <span>{children}</span>
            <span
                aria-hidden="true"
                className="grid size-13.5 place-items-center rounded-full bg-white font-[Arial,sans-serif] text-[30px] leading-none font-extralight text-[#ef9772] max-[768px]:size-11 max-[768px]:shrink-0 max-[768px]:text-2xl"
            >
                ↗
            </span>
        </a>
    );
}
