import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { EditorMode } from '@/lib/invitation/sectionRules';
import type { InvitationSection } from '@/lib/invitation/sections';
import { BACKGROUND_EFFECTS, type SectionStyle, THEME_BACKGROUND_SLOTS } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';

// A section's theme background, effect and transition (old wedartOpenSectionThemeBg,
// wedartOpenSectionBgEffect and wedartOpenSectionTransition).

type DocumentRecipe = (draft: Draft<InvitationDocument>) => void;

export type ThemeBackgroundSlot = (typeof THEME_BACKGROUND_SLOTS)[number];
export type ThemeBackgroundChoice = ThemeBackgroundSlot | 'auto';
export type BackgroundEffect = NonNullable<SectionStyle['effect']>;
export type BackgroundEffectType = (typeof BACKGROUND_EFFECTS)[number];
export type SectionTransition = NonNullable<SectionStyle['transition']>;

export const DEFAULT_EFFECT: BackgroundEffect = { type: 'none', speed: 'slow', intensity: 'subtle' };

// The theme backgrounds that have art. An empty slot can't be picked.
export function availableBackgroundSlots(theme: ThemeDesign): ThemeBackgroundSlot[] {
    return THEME_BACKGROUND_SLOTS.filter((slot) => Boolean(theme.backgrounds[slot].desktop ?? theme.backgrounds[slot].mobile));
}

// What a host may pick for this section: the admin's allowed list, of the backgrounds the theme has.
export function hostBackgroundSlots(section: Pick<InvitationSection, 'type' | 'style'>, theme: ThemeDesign): ThemeBackgroundSlot[] {
    if (section.type === 'footer') return [];
    const { enabled, allowed } = section.style.hostBackgrounds;
    if (!enabled) return [];
    const available = availableBackgroundSlots(theme);
    return available.filter((slot) => allowed.includes(slot));
}

// The theme background the section shows now; none when it has a colour or a photo.
export function selectedBackground(section: Pick<InvitationSection, 'style'>): ThemeBackgroundChoice | null {
    const { background } = section.style;
    return background.kind === 'theme' ? background.slot : null;
}

function editStyle(id: string, change: (style: Draft<SectionStyle>, section: Draft<InvitationSection>) => void): DocumentRecipe {
    return (draft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section) change(section.style, section);
    };
}

// Picks a theme background. A host only gets the ones allowed; the admin's
// pick is also the one a section returns to on reset.
export function setThemeBackground(id: string, choice: ThemeBackgroundChoice, mode: EditorMode, theme: ThemeDesign): DocumentRecipe {
    return editStyle(id, (style, section) => {
        if (section.type === 'footer') return;
        if (choice !== 'auto' && !availableBackgroundSlots(theme).includes(choice)) return;
        if (mode === 'admin') {
            style.background = { kind: 'theme', slot: choice };
            style.themeBackgroundDefault = choice;
            return;
        }
        if (choice === 'auto' || !hostBackgroundSlots(section, theme).includes(choice)) return;
        style.background = { kind: 'theme', slot: choice };
    });
}

// Admin: whether the host may change this section's background.
export function setHostBackgroundsEnabled(id: string, enabled: boolean, theme: ThemeDesign): DocumentRecipe {
    return editStyle(id, (style) => {
        style.hostBackgrounds.enabled = enabled;
        // Turning it on with nothing ticked offers every background the theme has, as the old switch did.
        const hasAllowed = style.hostBackgrounds.allowed.some((slot) => availableBackgroundSlots(theme).includes(slot));
        if (enabled && !hasAllowed) style.hostBackgrounds.allowed = availableBackgroundSlots(theme);
    });
}

// Admin: offers one background to the host, or takes it away.
export function setHostBackgroundAllowed(id: string, slot: ThemeBackgroundSlot, allowed: boolean): DocumentRecipe {
    return editStyle(id, (style) => {
        const rest = style.hostBackgrounds.allowed.filter((item) => item !== slot);
        style.hostBackgrounds.allowed = allowed ? THEME_BACKGROUND_SLOTS.filter((item) => item === slot || rest.includes(item)) : rest;
    });
}

export function sectionEffect(section: Pick<InvitationSection, 'style'>): BackgroundEffect {
    return section.style.effect ?? DEFAULT_EFFECT;
}

// Admin: the background effect. "No effect" with the default speed and intensity is no effect at all.
export function setBackgroundEffect(id: string, patch: Partial<BackgroundEffect>): DocumentRecipe {
    return editStyle(id, (style) => {
        const next = { ...(style.effect ?? DEFAULT_EFFECT), ...patch };
        const isDefault = next.type === 'none' && next.speed === DEFAULT_EFFECT.speed && next.intensity === DEFAULT_EFFECT.intensity;
        if (isDefault) delete style.effect;
        else style.effect = next;
    });
}

// Admin: the divider between this section and the next or the one before. No asset, no transition.
export function setSectionTransition(id: string, transition: SectionTransition | undefined): DocumentRecipe {
    return editStyle(id, (style, section) => {
        if (section.locked) return;
        if (transition?.assetId) style.transition = transition;
        else delete style.transition;
    });
}
