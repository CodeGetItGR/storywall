import type { RsvpApp } from '@/components/occasions/wedding/rsvp/RsvpAppMark';
import { RsvpColumnHead } from '@/components/occasions/wedding/rsvp/RsvpColumnHead';
import { RsvpNotification } from '@/components/occasions/wedding/rsvp/RsvpNotification';
import type { WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_RSVP_AVATARS } from '@/lib/occasions/weddingMedia';

// Same order as OccasionPages.WEDDING.rsvp.without.replies.
const RSVP_APPS: readonly RsvpApp[] = ['viber', 'whatsapp', 'messenger', 'email', 'sms'];

// Each card's place, width and tilt, and its badge's offset, as in the design.
const PLACEMENT = [
    { card: 'ml-[23%] w-[61%] rotate-3', badge: '-left-[13.4cqw]' },
    { card: 'ml-[17%] w-[65%] rotate-2', badge: '-left-[11cqw]' },
    { card: 'ml-[35%] w-[57%] rotate-3', badge: '-left-[15cqw]' },
    { card: 'ml-[19%] w-[72%] rotate-2', badge: '-left-[14cqw]' },
    { card: 'ml-[34%] w-[61%] rotate-2', badge: '-left-[12cqw]' },
] as const;

type RsvpWithoutProps = { caption: string; pill: string; replies: WeddingRsvpReplyCopy[] };

// Without StoryWall: five replies from five apps, scattered down the column.
export function RsvpWithout({ caption, pill, replies }: RsvpWithoutProps) {
    return (
        <div className="[container-type:inline-size] mx-auto w-[96%] min-[761px]:w-auto">
            <RsvpColumnHead caption={caption} className="text-[4.2cqw] min-[761px]:text-[5.1cqw]" pill={pill} tone="muted" />
            <ul className="m-0 mt-[3cqw] flex list-none flex-col gap-[2cqw] p-0">
                {replies.map((reply, index) => (
                    <RsvpNotification
                        app={RSVP_APPS[index]!}
                        avatar={WEDDING_RSVP_AVATARS[index]!}
                        badgeClassName={PLACEMENT[index]!.badge}
                        className={PLACEMENT[index]!.card}
                        copy={reply}
                        key={reply.name}
                    />
                ))}
            </ul>
        </div>
    );
}
