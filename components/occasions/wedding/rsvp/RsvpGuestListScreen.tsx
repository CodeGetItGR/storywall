import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { type RsvpHostCopy, RsvpHostHeader } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import type { WeddingRsvpGuestCopy } from '@/lib/occasions/weddingCopy';

type RsvpGuestListScreenProps = { host: RsvpHostCopy; list: WeddingRsvpGuestCopy[] };

// The host's list of replies, running off the bottom of the phone.
export function RsvpGuestListScreen({ host, list }: RsvpGuestListScreenProps) {
    return (
        <>
            <MockStatusBar />
            <RsvpHostHeader copy={host} />
            {/* Replies */}
            <ul className="m-0 mt-[3cqw] list-none px-[5cqw] py-0">
                {list.map((guest) => (
                    <li className="border-t border-[#151313]/8 py-[3.4cqw]" key={guest.name}>
                        <p className="m-0 truncate text-[4.6cqw] leading-tight font-bold">{guest.name}</p>
                        <p className="m-0 mt-[0.8cqw] text-[3.6cqw] leading-tight text-[#151313]/50">{guest.party}</p>
                        {guest.note ? <p className="m-0 mt-[1.8cqw] line-clamp-2 text-[3.8cqw] leading-snug">{guest.note}</p> : null}
                    </li>
                ))}
            </ul>
        </>
    );
}
