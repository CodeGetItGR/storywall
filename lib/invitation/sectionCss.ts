import type { CSSProperties } from 'react';

import { dateFieldIsTitle } from '@/lib/invitation/dateDisplay';
import type { TextStyle } from '@/lib/invitation/primitives';
import {
    type RenderContext,
    resolveFont,
    resolveTextColor,
    type TextContrast,
    type TextRole,
    textStyleCss,
} from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// Styles of a section's own fields and the CSS variables some sections set,
// ported from the old renderer's tb(), wedartDateTextBlock() and section
// markup.

export type FieldTag = 'div' | 'span' | 'p' | 'small' | 'h2' | 'h3' | 'h4';

// Headings, and fields the old renderer marked as names or big date parts,
// take the title font.
const TITLE_FIELD_CLASS = /(?:date-number|date-day|couple-name|couple-names-amp)/;

export function fieldTextRole(tag: FieldTag, className: string): TextRole {
    return /^h[1-4]$/.test(tag) || TITLE_FIELD_CLASS.test(className) ? 'title' : 'body';
}

export function fieldStyle(section: InvitationSection, path: string): TextStyle {
    return section.textStyles[path] ?? {};
}

export function fieldTextCss(
    section: InvitationSection,
    path: string,
    tag: FieldTag,
    className: string,
    contrast: TextContrast,
    ctx: RenderContext,
): CSSProperties {
    return textStyleCss(fieldStyle(section, path), { role: fieldTextRole(tag, className), contrast }, ctx);
}

// Date fields keep their preset's size and spacing; a host's own size and
// margins come in as variables the preset clamps.
export function dateTextCss(
    section: InvitationSection,
    path: string,
    className: string,
    contrast: TextContrast,
    ctx: RenderContext,
): CSSProperties {
    const style = fieldStyle(section, path);
    const css: Record<string, string | number | undefined> = {
        fontFamily: resolveFont(style.font, dateFieldIsTitle(className) ? 'title' : 'body', ctx),
        color: resolveTextColor(contrast, style.color, ctx),
        '--wedart-date-margin-top': `${style.marginTop ?? 0}px`,
        '--wedart-date-margin-bottom': `${style.marginBottom ?? 0}px`,
    };
    if (style.size) css['--wedart-date-user-size'] = `${style.size}px`;
    if (style.bold) css.fontWeight = 700;
    if (style.italic) css.fontStyle = 'italic';
    return css as CSSProperties;
}

// A section's own font only applies when no host preset replaces every font.
function ownFont(font: string | undefined, ctx: RenderContext): string | undefined {
    return !ctx.forcePreset && font ? font : undefined;
}

function cssVars(vars: Record<string, string | undefined>): CSSProperties | undefined {
    const defined = Object.entries(vars).filter((entry): entry is [string, string] => Boolean(entry[1]));
    return defined.length ? (Object.fromEntries(defined) as CSSProperties) : undefined;
}

const px = (value: number | undefined) => (value === undefined ? undefined : `${value}px`);

type CountdownData = Extract<InvitationSection, { type: 'countdown' }>['data'];

export function countdownVars(data: CountdownData, contrast: TextContrast, ctx: RenderContext): CSSProperties | undefined {
    const style = data.numberStyle ?? {};
    return cssVars({
        '--cd-font': ownFont(style.font, ctx),
        '--cd-size': px(style.size),
        '--cd-color': resolveTextColor(contrast, style.color, ctx),
    });
}

type FaqData = Extract<InvitationSection, { type: 'faq' }>['data'];

export function faqVars(data: FaqData, contrast: TextContrast, ctx: RenderContext): CSSProperties | undefined {
    const style = data.faqStyle ?? {};
    return cssVars({
        '--faq-q-font': ownFont(style.questionFont, ctx),
        '--faq-a-font': ownFont(style.answerFont, ctx),
        '--faq-q-size': px(style.questionSize),
        '--faq-a-size': px(style.answerSize),
        '--faq-q-color': resolveTextColor(contrast, style.questionColor, ctx),
        '--faq-a-color': resolveTextColor(contrast, style.answerColor, ctx),
        '--faq-fill-color': style.fillColor,
        '--faq-border-color': style.borderColor,
        '--faq-border-width': px(style.borderWidth),
    });
}

type IconStyle = { font?: string; color?: string };

export function contactVars(iconStyle: IconStyle | undefined, ctx: RenderContext): CSSProperties | undefined {
    return cssVars({ '--contact-font': ownFont(iconStyle?.font, ctx), '--contact-color': iconStyle?.color });
}

type RsvpData = Extract<InvitationSection, { type: 'rsvp' }>['data'];

export function rsvpVars(data: RsvpData, contrast: TextContrast, ctx: RenderContext): CSSProperties | undefined {
    const style = data.formStyle ?? {};
    return cssVars({
        '--rsvp-label-font': ownFont(style.labelFont, ctx),
        '--rsvp-label-color': resolveTextColor(contrast, style.labelColor, ctx),
        '--rsvp-label-size': px(style.labelSize),
        '--rsvp-field-fill-color': style.fieldFillColor,
        '--rsvp-field-border-color': style.fieldBorderColor,
        '--rsvp-field-border-width': px(style.fieldBorderWidth),
        '--rsvp-field-radius': px(style.fieldRadius),
        '--rsvp-option-selected-color': style.optionSelectedColor,
        '--rsvp-btn-bg': style.buttonBg,
        '--rsvp-btn-color': style.buttonColor,
        '--rsvp-btn-font': ownFont(style.buttonFont, ctx),
    });
}

type AccommodationData = Extract<InvitationSection, { type: 'accommodation' }>['data'];

export function stayVars(data: AccommodationData): CSSProperties | undefined {
    const style = data.cardStyle ?? {};
    return cssVars({
        '--stay-border-width': px(style.borderWidth),
        '--stay-border-color': style.borderColor,
        '--stay-fill-color': style.fillColor,
    });
}

type ProgramStyle = NonNullable<Extract<InvitationSection, { type: 'program' }>['data']['programStyle']>;

export function programVars(style: ProgramStyle | undefined, contrast: TextContrast, ctx: RenderContext): CSSProperties | undefined {
    return cssVars({
        '--program-color': style?.color,
        '--program-time-font': ownFont(style?.timeFont, ctx),
        '--program-time-size': px(style?.timeSize),
        '--program-time-color': resolveTextColor(contrast, style?.timeColor, ctx),
        '--program-label-font': ownFont(style?.labelFont, ctx),
        '--program-label-size': px(style?.labelSize),
        '--program-description-size': px(style?.descriptionSize),
        '--program-label-color': resolveTextColor(contrast, style?.labelColor, ctx),
        '--program-line-width': style?.lineWidth ? px(style.lineWidth) : undefined,
        '--program-font': ownFont(style?.font, ctx),
        '--program-size': px(style?.size),
        '--program-icon-color': style?.iconColor,
        '--program-node-color': style?.nodeColor,
    });
}

type FooterData = Extract<InvitationSection, { type: 'footer' }>['data'];

export function footerTextCss(data: FooterData, contrast: TextContrast, ctx: RenderContext): CSSProperties | undefined {
    const css: CSSProperties = {};
    const color = resolveTextColor(contrast, data.textColor, ctx);
    if (color) css.color = color;
    const font = ownFont(data.font, ctx);
    if (font) css.fontFamily = font;
    return Object.keys(css).length ? css : undefined;
}
