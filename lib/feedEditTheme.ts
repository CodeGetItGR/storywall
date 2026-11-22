import type { Draft } from 'immer';

import type { EventThemeDto, ThemePresetDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';

// A wall preset picked in edit mode, written to the event on Save. presetId null: "No theme".
export type HeldWall = { presetId: string | null; theme: EventThemeDto | null };

// The event theme a preset would apply, for drawing it before it is saved.
export function presetAsEventTheme(preset: ThemePresetDto): EventThemeDto {
    return {
        presetKey: preset.key,
        backgroundColor: preset.backgroundColor,
        illustrationUrl: preset.illustrationUrl,
        titleColor: preset.titleColor,
        headingFont: preset.headingFont,
    };
}

// The editor store's recipe for a planned theme switch: the planned document takes over.
export function replaceFeedDocument(next: InvitationDocument) {
    return (draft: Draft<InvitationDocument>) => {
        draft.themeId = next.themeId;
        draft.overrides = next.overrides;
        draft.sections = next.sections;
    };
}

// The feed's one background colour; undefined goes back to the theme's backgrounds.
export function setFeedBackground(color: string | undefined) {
    return (draft: Draft<InvitationDocument>) => {
        if (color === undefined) delete draft.overrides.backgroundColor;
        else draft.overrides.backgroundColor = color;
    };
}
