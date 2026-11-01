import type { ReactNode } from 'react';

import { QR_WEDDING_CREATE_HREF } from '@/lib/qrWeddingPage';

// The gradient "Create your StoryWall" pill under the comparison.
export function QrWeddingCreateCta({ children }: { children: ReactNode }) {
    return (
        <a
            className="inline-flex min-h-18.5 items-center justify-center rounded-full bg-[linear-gradient(100deg,#ff6f93_0%,#ff936a_52%,#ffd05b_100%)] px-7 py-2.5 [font-family:var(--editorial)] text-[19px] leading-[1.05] font-normal text-white shadow-[0_18px_38px_-16px_rgba(255,111,147,.55)] max-[768px]:min-h-14.5 max-[768px]:max-w-full max-[768px]:px-5 max-[768px]:py-1.75 max-[768px]:text-base"
            href={QR_WEDDING_CREATE_HREF}
        >
            <span>{children}</span>
        </a>
    );
}
