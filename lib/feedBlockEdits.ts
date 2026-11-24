import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import { MAX_ELEMENTS, writeSectionColor } from '@/lib/invitation/textEditing';

// What the block buttons and the feed toolbar do to one Save my date block (spec items 6 and 9). Each is an Immer
// recipe for the editor's store; a locked or full block is left as it is.

type DocumentDraft = Draft<InvitationDocument>;

// A new photo is drawn at the block's width up to this (Open question 7).
export const FEED_PHOTO_WIDTH = 320;

function openBlock(draft: DocumentDraft, sectionId: string) {
    const section = draft.sections.find((item) => item.id === sectionId);
    return section && !section.locked && section.elements.length < MAX_ELEMENTS ? section : null;
}

export function addFeedBlockPhoto(sectionId: string, elementId: string, mediaId: string) {
    return (draft: DocumentDraft) => {
        const section = openBlock(draft, sectionId);
        if (!section) return;
        const photo: InvitationElement = { id: elementId, kind: 'image', image: { source: 'media', mediaId }, width: FEED_PHOTO_WIDTH };
        section.elements.push(photo as Draft<InvitationElement>);
    };
}

// An empty link after the text being edited, else last; its text and address are typed in the block's settings.
export function addFeedBlockLink(sectionId: string, elementId: string, afterElementId?: string) {
    return (draft: DocumentDraft) => {
        const section = openBlock(draft, sectionId);
        if (!section) return;
        const link: InvitationElement = { id: elementId, kind: 'link', text: '', url: '' };
        const after = afterElementId ? section.elements.findIndex((item) => item.id === afterElementId) : -1;
        section.elements.splice(after >= 0 ? after + 1 : section.elements.length, 0, link as Draft<InvitationElement>);
    };
}

export function colorFeedBlockText(sectionId: string, color: string, sectionPaths: Iterable<string>) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (section && !section.locked) writeSectionColor(draft, sectionId, color, sectionPaths);
    };
}

export function removeFeedBlockElement(sectionId: string, elementId: string) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (section && !section.locked) section.elements = section.elements.filter((element) => element.id !== elementId);
    };
}

// The droplet's starting colour: the block's first styled text colour, else the invitation's text colour.
export function blockTextColor(section: Pick<InvitationSection, 'textStyles' | 'elements'>, ctx: Pick<RenderContext, 'textColor'>): string {
    const styled = Object.values(section.textStyles).find((style) => style?.color)?.color;
    const element = section.elements.find((item) => item.kind === 'text' && item.style.color);
    return styled ?? (element?.kind === 'text' ? element.style.color : undefined) ?? ctx.textColor;
}

// The section holding an element: element ids are unique in a document.
export function elementSectionId(document: InvitationDocument, elementId: string): string | undefined {
    return document.sections.find((section) => section.elements.some((element) => element.id === elementId))?.id;
}
