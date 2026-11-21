import { z } from 'zod';

// Building blocks shared by every part of an invitation document. Spring
// validates the same rules on every write; see
// docs/superpowers/specs/2026-11-02-invitation-document-format.md.

export const MAX_TEXT = 20_000;

export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);

export const textSchema = z.string().max(MAX_TEXT);

export const shortTextSchema = z.string().max(300);

export const colorSchema = z.union([
    z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    z.literal('transparent'),
]);

// Font family names may hold spaces, commas and single quotes, never
// characters that could break out of a CSS value.
export const fontSchema = z.string().max(300).regex(/^[^<>"`;\\\r\n{}]*$/);

export const linkSchema = z
    .string()
    .max(5000)
    // The allowed schemes as a pattern too, so the exported JSON Schema keeps them.
    .regex(/^$|^#|^(?:[hH][tT][tT][pP][sS]?|[mM][aA][iI][lL][tT][oO]|[tT][eE][lL]|[sS][mM][sS]):/)
    .refine((value) => value === '' || isAllowedLink(value), 'Unsupported link');

function isAllowedLink(value: string): boolean {
    if (value.startsWith('#')) return true;
    try {
        const url = new URL(value);
        return ['https:', 'http:', 'mailto:', 'tel:', 'sms:'].includes(url.protocol);
    } catch {
        return false;
    }
}

// An uploaded file in our storage. The document never holds URLs or inline
// data for images; the renderer turns the id into a URL.
export const mediaRefSchema = z.object({ mediaId: idSchema }).strict();

// An image is an upload, a piece of the theme's own library (elements,
// frames, icons) referenced by the theme's asset id, or a photo of the
// invitation's event (the gallery's picks and the cover). The backend accepts
// an event photo only from the draft's own event.
export const imageRefSchema = z.discriminatedUnion('source', [
    z.object({ source: z.literal('media'), mediaId: idSchema }).strict(),
    z.object({ source: z.literal('theme'), assetId: idSchema }).strict(),
    z.object({ source: z.literal('event'), mediaId: idSchema }).strict(),
]);

// Fields that follow the invitation's event until the host edits them on the
// invitation (docs/superpowers/specs/2026-11-06-invitation-module-integration-design.md).
export const eventLinkSchema = z.object({ source: z.literal('event'), enabled: z.boolean() }).strict();

export const alignSchema = z.enum(['left', 'center', 'right']);

export const textStyleSchema = z
    .object({
        font: fontSchema.optional(),
        size: z.number().min(6).max(400).optional(),
        color: colorSchema.optional(),
        align: alignSchema.optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        lineHeight: z.number().min(0.5).max(4).optional(),
        marginTop: z.number().min(-500).max(1000).optional(),
        marginBottom: z.number().min(-500).max(1000).optional(),
    })
    .strict();

export type MediaRef = z.infer<typeof mediaRefSchema>;
export type ImageRef = z.infer<typeof imageRefSchema>;
export type EventLink = z.infer<typeof eventLinkSchema>;
export type TextStyle = z.infer<typeof textStyleSchema>;
