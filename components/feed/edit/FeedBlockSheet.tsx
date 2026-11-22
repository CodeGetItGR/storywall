'use client';

import { ChevronRight } from 'lucide-react';
import { useCallback } from 'react';

import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

type FeedBlockSheetProps = {
    title: string;
    open: boolean;
    scope: SettingsScope | null;
    groups: SettingsGroup[];
    parts: SettingsPart[];
    partLabels: Record<SettingsPart, string>;
    isDesktop: boolean;
    onOpenPart: (part: SettingsPart) => void;
    onClose: () => void;
};

// The pencil's sheet: the event fields the block shows, then its style. A panel at the right on
// desktop, a sheet over the lower screen on phones; the feed above stays live either way.
export function FeedBlockSheet({ title, open, scope, groups, parts, partLabels, isDesktop, onOpenPart, onClose }: FeedBlockSheetProps) {
    const body = (
        <div className="flex flex-col gap-5">
            {/* Event details */}
            {parts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {parts.map((part) => (
                        <FeedBlockPartRow key={part} part={part} label={partLabels[part]} onOpen={onOpenPart} />
                    ))}
                </div>
            )}

            {/* Style */}
            {scope && groups.length > 0 && <SectionSettingsPanel scope={scope} groups={groups} />}
        </div>
    );

    return (
        <FeedEditSheetFrame open={open} title={title} isDesktop={isDesktop} onClose={onClose}>
            {body}
        </FeedEditSheetFrame>
    );
}

type FeedBlockPartRowProps = { part: SettingsPart; label: string; onOpen: (part: SettingsPart) => void };

// One event field, opened in the Settings page's own editor.
function FeedBlockPartRow({ part, label, onOpen }: FeedBlockPartRowProps) {
    const open = useCallback(() => onOpen(part), [onOpen, part]);

    return (
        <button
            type="button"
            onClick={open}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-(--smd-editor-control) px-3 text-left text-[13px] text-(--smd-editor-text) transition-colors hover:bg-white/10"
        >
            {label}
            <ChevronRight className="h-4 w-4 text-(--smd-editor-muted)" aria-hidden="true" />
        </button>
    );
}
