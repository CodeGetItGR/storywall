import { ChevronDown, LayoutGrid, Users } from 'lucide-react';

export type RsvpHostCopy = { couple: string; dashboard: string; module: string };

type RsvpHostHeaderProps = {
    // The "Active" pill beside the couple's names.
    active?: string;
    // A chevron on the module chip, as a menu.
    chevron?: boolean;
    copy: RsvpHostCopy;
};

// The top of the host dashboard: its label, the couple, and the RSVP module chip.
export function RsvpHostHeader({ active, chevron = false, copy }: RsvpHostHeaderProps) {
    return (
        <div className="px-[5cqw] pt-[3cqw]">
            {/* Dashboard and couple */}
            <p className="m-0 flex items-center gap-[1.4cqw] text-[3cqw] font-semibold tracking-[0.08em] text-[#151313]/50">
                <LayoutGrid className="size-[3.4cqw] text-[#ff765f]" strokeWidth={2} />
                {copy.dashboard}
            </p>
            <div className="mt-[1.4cqw] flex items-center justify-between gap-[2cqw]">
                <p className="m-0 truncate text-[5.2cqw] leading-tight font-bold">{copy.couple}</p>
                {active ? (
                    <span className="shrink-0 rounded-full bg-[#fde4e1] px-[2.6cqw] py-[1cqw] text-[3.4cqw] font-semibold text-[#e5484d]">
                        {active}
                    </span>
                ) : null}
            </div>
            {/* Module */}
            <div className="mt-[4cqw] flex items-center gap-[2.4cqw] rounded-[6cqw] bg-[#f8ece1] px-[5cqw] py-[5cqw] text-[4.2cqw] leading-none font-bold">
                <Users className="size-[4.6cqw] text-[#ff765f]" strokeWidth={2} />
                {copy.module}
                {chevron ? <ChevronDown className="ml-auto size-[4.4cqw] text-[#151313]/50" strokeWidth={2} /> : null}
            </div>
        </div>
    );
}
