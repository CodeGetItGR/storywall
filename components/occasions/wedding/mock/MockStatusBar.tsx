import { BatteryFull, Signal, Wifi } from 'lucide-react';

// The top of a drawn phone screen. The clock is part of the picture, the same in every language.
export function MockStatusBar() {
    return (
        <div className="flex items-center justify-between px-[7cqw] pt-[3.4cqw] pb-[1.6cqw] text-[3.6cqw] leading-none font-semibold">
            <span>17:59</span>
            <span className="flex items-center gap-[1.2cqw]">
                <Signal className="size-[3.8cqw]" strokeWidth={2.4} />
                <Wifi className="size-[3.8cqw]" strokeWidth={2.4} />
                <BatteryFull className="size-[4.8cqw]" strokeWidth={2} />
            </span>
        </div>
    );
}
