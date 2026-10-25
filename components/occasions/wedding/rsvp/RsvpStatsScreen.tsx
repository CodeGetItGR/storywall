import { CalendarClock, ChartColumn, FileText, List } from 'lucide-react';

import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';
import { type RsvpHostCopy, RsvpHostHeader } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import type { WeddingRsvpStatsCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// Stats, list, reports; stats is the open tab.
const TAB_ICONS = [ChartColumn, List, FileText] as const;

const ROW = 'flex items-baseline justify-between text-[3.6cqw]';

// The host's RSVP stats: deadline, four totals and attendance.
export function RsvpStatsScreen({ host, stats }: { host: RsvpHostCopy; stats: WeddingRsvpStatsCopy }) {
    return (
        <>
            <MockStatusBar />
            <RsvpHostHeader active={stats.active} chevron copy={host} />
            {/* Tabs */}
            <div className="mt-[4cqw] flex border-b border-[#151313]/8 px-[4cqw] text-[3.6cqw]">
                {stats.tabs.map((tab, index) => {
                    const Icon = TAB_ICONS[index]!;
                    return (
                        <span
                            className={cn(
                                'flex flex-1 items-center justify-center gap-[1.2cqw] border-b-[0.6cqw] py-[2.6cqw]',
                                index === 0 ? 'border-[#ff765f] font-semibold' : 'border-transparent text-[#151313]/55',
                            )}
                            key={tab}
                        >
                            <Icon className="size-[3.6cqw]" strokeWidth={2} />
                            {tab}
                        </span>
                    );
                })}
            </div>
            <div className="px-[5cqw]">
                {/* Deadline */}
                <div className="mt-[4cqw] flex items-center gap-[2.6cqw]">
                    <span className="grid size-[8cqw] shrink-0 place-items-center rounded-full bg-[#fde9e2] text-[#ff765f]">
                        <CalendarClock className="size-[4.2cqw]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[2.8cqw] tracking-[0.06em] text-[#e8604a]">{stats.deadline}</span>
                        <span className="mt-[0.6cqw] block truncate text-[3.4cqw] font-semibold">{stats.deadlineValue}</span>
                    </span>
                </div>
                {/* Totals */}
                <div className="mt-[4cqw] grid grid-cols-2 overflow-hidden rounded-[3cqw] border border-[#151313]/10">
                    {stats.tiles.map((tile) => (
                        <span
                            className="flex flex-col items-center border-[#151313]/10 py-[3.6cqw] odd:border-r [&:nth-child(-n+2)]:border-b"
                            key={tile.label}
                        >
                            <span className="text-[7cqw] leading-none font-bold">{tile.value}</span>
                            <span className="mt-[1.4cqw] text-[2.6cqw] tracking-[0.06em] text-[#151313]/50">{tile.label}</span>
                        </span>
                    ))}
                </div>
                {/* Attendance */}
                <p className="m-0 mt-[4.4cqw] text-[2.8cqw] tracking-[0.06em] text-[#151313]/50">{stats.byCategory}</p>
                <div className={cn(ROW, 'mt-[2.6cqw]')}>
                    <span>{stats.coming}</span>
                    <span className="font-bold">
                        {stats.comingValue} <span className="font-normal text-[#151313]/40">{stats.comingShare}</span>
                    </span>
                </div>
                <span className="mt-[1.6cqw] block h-[1.6cqw] rounded-full bg-[#ff765f]" />
                <div className={cn(ROW, 'mt-[3cqw]')}>
                    <span className="text-[#151313]/55">{stats.notComing}</span>
                    <span className="font-bold">{stats.notComingValue}</span>
                </div>
            </div>
            <MockTabBar />
        </>
    );
}
