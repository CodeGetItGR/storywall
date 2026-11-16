import { ChevronRight } from 'lucide-react';
import Image from 'next/image';

import { AppLink } from '@/components/ui/AppLink';
import type { QuickTool } from '@/hooks/useDayJourney';
import { journeyIcons } from '@/lib/journeyIcons';

function ToolIcon({ tool }: { tool: QuickTool }) {
    const icon = journeyIcons[tool.icon];
    if (icon.kind === 'image') return <Image src={icon.src} alt={tool.label} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />;
    return <icon.icon className="h-6 w-6 text-primary-dark" role="img" aria-label={tool.label} />;
}

/** On the day: the tools a host reaches for during the event. */
export function QuickTools({ tools }: { tools: QuickTool[] }) {
    if (tools.length === 0) return null;
    return (
        <ul className="flex flex-col rounded-3xl bg-primary-light/40 p-2">
            {tools.map((tool) => (
                <li key={tool.key}>
                    {/* Tool row */}
                    <AppLink href={tool.href} className="flex min-h-14 items-center gap-3 rounded-2xl px-3 font-semibold text-ink hover:bg-white/60">
                        <ToolIcon tool={tool} />
                        <span className="flex-1">{tool.label}</span>
                        <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                    </AppLink>
                </li>
            ))}
        </ul>
    );
}
