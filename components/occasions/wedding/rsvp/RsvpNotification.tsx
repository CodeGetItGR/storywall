import { Check, X } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { type RsvpApp, RsvpAppMark } from '@/components/occasions/wedding/rsvp/RsvpAppMark';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

type RsvpNotificationProps = {
    app: RsvpApp;
    avatar: OccasionPhoto;
    // Where the app badge sits left of the card.
    badgeClassName: string;
    // The card's place, width and tilt.
    className: string;
    copy: WeddingRsvpReplyCopy;
};

// One reply as it lands on the couple's phone: the app, the guest, when, and the answer.
export function RsvpNotification({ app, avatar, badgeClassName, className, copy }: RsvpNotificationProps) {
    return (
        <li
            className={cn(
                'relative flex items-center gap-[4.5cqw] rounded-[3.4cqw] bg-[#fbf8f3] py-[3.2cqw] pr-[4cqw] pl-[3.5cqw] shadow-[0_2cqw_5cqw_-2cqw_rgba(70,38,24,0.28)]',
                className,
            )}
        >
            {/* App */}
            <span className={cn('absolute top-1/2 -translate-y-1/2', badgeClassName)}>
                <RsvpAppMark app={app} />
            </span>
            {/* Guest */}
            <MockPhoto className="size-[13.4cqw] shrink-0 rounded-full border-[0.6cqw] border-white" photo={avatar} sizes="64px" />
            <div className="min-w-0">
                <p className="m-0 text-[3.6cqw] leading-tight font-medium">{copy.name}</p>
                <p className="m-0 mt-[0.6cqw] text-[2.7cqw] leading-tight text-[#151313]/55">{copy.time}</p>
                {/* Answer */}
                <span
                    className={cn(
                        'mt-[1.6cqw] inline-flex items-center gap-[1.6cqw] rounded-full px-[3.8cqw] py-[1.6cqw] text-[3.4cqw] leading-none font-medium',
                        copy.going ? 'bg-[#e4f0e1] text-[#2a6834]' : 'bg-[#fde4e1] text-[#d93a32]',
                    )}
                >
                    {copy.going ? <Check className="size-[3.6cqw]" strokeWidth={2.4} /> : <X className="size-[3.6cqw]" strokeWidth={2.4} />}
                    {copy.answer}
                </span>
            </div>
        </li>
    );
}
