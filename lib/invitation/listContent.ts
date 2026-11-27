import { placeMapUrl } from '@/lib/invitation/mapLinks';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type SectionData<T extends InvitationSection['type']> = Extract<InvitationSection, { type: T }>['data'];
type FaqItem = SectionData<'faq'>['items'][number];
type Stay = SectionData<'accommodation'>['items'][number];
type Person = SectionData<'godparents'>['godparents'][number] | SectionData<'parentsSimple'>['godparents'][number];

const filled = (...values: (string | undefined)[]) => values.some((value) => Boolean(value?.trim()));

// An answer alone would show guests an empty question, so a question is what counts.
export const faqItemHasContent = (item: FaqItem) => filled(item.question);

export const stayHasContent = (stay: Stay) => filled(stay.name, stay.address, stay.phone, stay.email, stay.website, stay.mapUrl);

export const personHasContent = (person: Person) => filled(person.name) || ('photo' in person && Boolean(person.photo));

// The editor draws every item, so a new one can be typed in; guests only see the ones with something in them.
export function visibleItems<T>(items: readonly T[], hasContent: (item: T) => boolean, ctx: RenderContext): readonly T[] {
    return ctx.renderText ? items : items.filter(hasContent);
}

// The editor draws an empty text so it can be typed in; guests get nothing for it.
export const showsText = (value: string, ctx: RenderContext) => Boolean(ctx.renderText) || filled(value);

// A place to stay's map link: the host's own, or a search for its name and address. Empty when it has neither.
export function stayMapUrl(stay: Stay): string {
    return placeMapUrl(stay.mapUrl, stay.name, stay.address);
}
