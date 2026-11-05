import { z } from 'zod';

import {
    idSchema,
    imageRefSchema,
    linkSchema,
    shortTextSchema,
    textSchema,
    textStyleSchema,
} from '@/lib/invitation/primitives';

// Elements added under a section's own fields (the old `texts[]`).

export const FRAME_ANIMATIONS = [
    'none', 'fade-in', 'fade-up', 'fade-down', 'zoom-in-soft', 'zoom-out-soft', 'slide-left',
    'slide-right', 'float', 'gentle-pulse', 'soft-rotate-in', 'swing-soft', 'blur-reveal',
    'mask-reveal', 'parallax-soft', 'pop-elegant',
] as const;

const base = { id: idSchema };

export const textElementSchema = z
    .object({
        ...base,
        kind: z.literal('text'),
        role: z.enum(['title', 'subtitle', 'paragraph']),
        text: textSchema,
        style: textStyleSchema,
        // Custom sections only: shown above both columns.
        fullWidth: z.boolean().optional(),
    })
    .strict();

export const spacerElementSchema = z
    .object({ ...base, kind: z.literal('spacer'), height: z.number().min(0).max(2000) })
    .strict();

export const imageElementSchema = z
    .object({ ...base, kind: z.literal('image'), image: imageRefSchema, width: z.number().min(20).max(2000) })
    .strict();

export const linkElementSchema = z
    .object({ ...base, kind: z.literal('link'), text: shortTextSchema, url: linkSchema })
    .strict();

export const photoFrameFieldsSchema = z
    .object({
        frameId: idSchema.or(z.literal('')),
        photo: imageRefSchema.optional(),
        imageX: z.number().min(0).max(100),
        imageY: z.number().min(0).max(100),
        zoom: z.number().min(0.1).max(10),
        boxScale: z.number().min(0.1).max(10),
        imageWidth: z.number().min(0).max(20_000),
        imageHeight: z.number().min(0).max(20_000),
        animation: z.enum(FRAME_ANIMATIONS),
    })
    .strict();

export const photoFrameElementSchema = z
    .object({ ...base, kind: z.literal('photoFrame'), ...photoFrameFieldsSchema.shape })
    .strict();

// Custom sections only: everything before it is column one, after it column two.
export const columnBreakElementSchema = z.object({ ...base, kind: z.literal('columnBreak') }).strict();

export const elementSchema = z.discriminatedUnion('kind', [
    textElementSchema,
    spacerElementSchema,
    imageElementSchema,
    linkElementSchema,
    photoFrameElementSchema,
    columnBreakElementSchema,
]);

export type InvitationElement = z.infer<typeof elementSchema>;
