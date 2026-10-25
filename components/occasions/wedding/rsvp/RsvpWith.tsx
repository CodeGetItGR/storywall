import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import { RsvpColumnHead } from '@/components/occasions/wedding/rsvp/RsvpColumnHead';
import { RsvpFormScreen } from '@/components/occasions/wedding/rsvp/RsvpFormScreen';
import { RsvpGuestListScreen } from '@/components/occasions/wedding/rsvp/RsvpGuestListScreen';
import type { RsvpHostCopy } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import { RsvpStatsScreen } from '@/components/occasions/wedding/rsvp/RsvpStatsScreen';
import type { WeddingRsvpFormCopy, WeddingRsvpGuestCopy, WeddingRsvpStatsCopy } from '@/lib/occasions/weddingCopy';

type RsvpWithProps = {
    caption: string;
    form: WeddingRsvpFormCopy;
    host: RsvpHostCopy;
    list: WeddingRsvpGuestCopy[];
    pill: string;
    stats: WeddingRsvpStatsCopy;
};

// With StoryWall: the host's list and stats tilted behind the guest's form.
export function RsvpWith({ caption, form, host, list, pill, stats }: RsvpWithProps) {
    return (
        <div className="[container-type:inline-size]">
            <RsvpColumnHead caption={caption} className="text-[3.2cqw]" pill={pill} tone="brand" />
            {/* Phones */}
            <div className="relative mt-[3cqw] aspect-[612/575]">
                <MockPhone className="absolute top-[3%] left-[0.5%] w-[42%] -rotate-4">
                    <RsvpGuestListScreen host={host} list={list} />
                </MockPhone>
                <MockPhone className="absolute top-0 left-[27%] z-10 w-[42%]">
                    <RsvpFormScreen form={form} module={host.module} />
                </MockPhone>
                <MockPhone className="absolute top-[4%] right-[0.5%] w-[42%] rotate-4">
                    <RsvpStatsScreen host={host} stats={stats} />
                </MockPhone>
            </div>
        </div>
    );
}
