'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { FeedPinnedField } from '@/components/feed/edit/FeedPinnedField';
import { FeedPromptField } from '@/components/feed/edit/FeedPromptField';
import { FeedSectionBackgroundFields } from '@/components/feed/edit/FeedSectionBackgroundFields';
import { FeedSectionPhotoField } from '@/components/feed/edit/FeedSectionPhotoField';
import { FeedSectionTextColorField } from '@/components/feed/edit/FeedSectionTextColorField';
import { SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SettingsToggle } from '@/components/saveMyDate/editor/settings/SettingsControls';
import type { FeedSectionContent } from '@/hooks/useFeedSectionContent';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { PinnedPhoto } from '@/lib/feedPinned';
import type { MediaResolver } from '@/lib/invitation/render';
import { groupsOfKind, type SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

type FeedBlockSheetProps = {
    title: string;
    open: boolean;
    scope: SettingsScope | null;
    groups: SettingsGroup[];
    parts: SettingsPart[];
    partLabels: Record<SettingsPart, string>;
    isDesktop: boolean;
    // null: the block can't be members only (the cover, details and RSVP).
    membersOnly: boolean | null;
    onMembersOnly: (membersOnly: boolean) => void;
    // The photo prompt's line; null on every other block.
    promptText: string | null;
    onPromptText: (text: string) => void;
    // Pinned photos' photos; null on every other block.
    pinned: readonly PinnedPhoto[] | null;
    pinnedUploading: boolean;
    media: MediaResolver;
    // A Save my date section's photo, text colour and background; null on every other block.
    content?: FeedSectionContent | null;
    onAddPinned: (file: File) => void;
    onRemovePinned: (photoId: string) => void;
    onMovePinned: (activeId: string, overId: string) => void;
    onOpenPart: (part: SettingsPart) => void;
    onClose: () => void;
};

// The pencil's sheet, in one order on every section: its own inputs, Add photo, who sees it, then all its styling. A panel at the right on
// desktop, a sheet over the lower screen on phones; the feed above stays live either way.
export function FeedBlockSheet({
    title,
    open,
    scope,
    groups,
    parts,
    partLabels,
    isDesktop,
    membersOnly,
    onMembersOnly,
    promptText,
    onPromptText,
    pinned,
    pinnedUploading,
    media,
    content = null,
    onAddPinned,
    onRemovePinned,
    onMovePinned,
    onOpenPart,
    onClose,
}: FeedBlockSheetProps) {
    const t = useTranslations('FeedLayout');
    const inputs = groupsOfKind(groups, 'inputs');
    const style = groupsOfKind(groups, 'style');
    const body = (
        <div className="flex flex-col gap-5">
            {/* Prompt */}
            {promptText !== null && <FeedPromptField text={promptText} onChange={onPromptText} />}

            {/* Pinned photos */}
            {pinned !== null && (
                <FeedPinnedField
                    photos={pinned}
                    media={media}
                    uploading={pinnedUploading}
                    onAdd={onAddPinned}
                    onRemove={onRemovePinned}
                    onMove={onMovePinned}
                />
            )}

            {/* Event details */}
            {parts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {parts.map((part) => (
                        <FeedBlockPartRow key={part} part={part} label={partLabels[part]} onOpen={onOpenPart} />
                    ))}
                </div>
            )}

            {/* The section's own inputs */}
            {scope && inputs.length > 0 && <SectionSettingsPanel scope={scope} groups={inputs} />}

            {/* Add photo */}
            {content && !groups.includes('galleryPhotos') && (
                <FeedSectionPhotoField uploading={content.uploading} failed={content.failed} onPhoto={content.onPhoto} />
            )}

            {/* Who sees it */}
            {membersOnly !== null && (
                <SettingsToggle label={t('membersOnly')} hint={t('membersOnlyNote')} checked={membersOnly} onChange={onMembersOnly} />
            )}

            {/* Text colour */}
            {content && <FeedSectionTextColorField value={content.textColor} themeColors={content.themeColors} onChange={content.onTextColor} />}

            {/* Style */}
            {scope && style.length > 0 && <SectionSettingsPanel scope={scope} groups={style} />}

            {/* Background */}
            {content && <FeedSectionBackgroundFields {...content.background} themeColors={content.themeColors} uploading={content.uploading} />}
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
