import { Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { FaFacebookMessenger, FaViber, FaWhatsapp } from 'react-icons/fa';

import { cn } from '@/lib/utils';

export type RsvpApp = 'viber' | 'whatsapp' | 'messenger' | 'email' | 'sms';

// Each app's color and mark. "SMS" is part of the picture, the same in every language.
const MARK: Record<RsvpApp, { className: string; icon: ReactNode }> = {
    viber: { className: 'bg-[#7360f2]', icon: <FaViber className="size-[5.2cqw]" /> },
    whatsapp: { className: 'bg-[#25d366]', icon: <FaWhatsapp className="size-[5.4cqw]" /> },
    messenger: {
        className: 'bg-[linear-gradient(45deg,#0099ff,#a033ff_60%,#ff5280_90%,#ff7061)]',
        icon: <FaFacebookMessenger className="size-[5cqw]" />,
    },
    email: { className: 'bg-[#f0614f]', icon: <Mail className="size-[4.8cqw]" strokeWidth={2} /> },
    sms: { className: 'bg-[#5cb85c]', icon: <span className="text-[2.6cqw] font-extrabold">SMS</span> },
};

// The badge of the app a reply came from: the app's round mark on a white ring.
export function RsvpAppMark({ app }: { app: RsvpApp }) {
    const mark = MARK[app];
    return (
        <span className="grid size-[11.8cqw] place-items-center rounded-full bg-white shadow-[0_1cqw_3cqw_rgba(70,38,24,0.18)]">
            <span className={cn('grid size-[8.6cqw] place-items-center rounded-full text-white', mark.className)}>{mark.icon}</span>
        </span>
    );
}
