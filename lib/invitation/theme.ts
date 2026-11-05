import { z } from 'zod';

import { colorSchema, fontSchema, idSchema, mediaRefSchema, shortTextSchema } from '@/lib/invitation/primitives';

// The look an admin designs for a theme. Invitations reference it; they never
// copy it until they are published.

export const TEXT_ANIMATIONS = [
    'none', 'fade-up', 'fade-down', 'fade-in', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out',
    'blur-in', 'rotate-in', 'bounce-in', 'letter-spacing-in', 'skew-in', 'flip-up', 'elastic-scale',
    'reveal-mask', 'soft-rise', 'fade-rotate', 'tracking-reveal', 'scale-pop', 'soft-bounce',
    'mask-left', 'mask-center', 'glow-reveal', 'swing-in', 'drop-in',
] as const;

export const PHOTO_SHAPES = [
    'square', 'portrait', 'landscape', 'circle', 'rounded', 'oval', 'arch', 'extraRounded',
    'hexagon', 'diamond', 'octagon', 'teardrop', 'blob',
] as const;

const backgroundSchema = z
    .object({
        desktop: mediaRefSchema.optional(),
        mobile: mediaRefSchema.optional(),
        mode: z.enum(['cover', 'repeat', 'texture']),
        // Fits the art to the section width once, anchored at the top, and
        // repeats it down a taller section instead of rescaling it.
        stableRepeat: z.boolean(),
    })
    .strict();

export const ART_ANIMATIONS = [
    'none', 'fade', 'slideup', 'slideleft', 'slideright', 'zoom', 'rotatein', 'float', 'drift', 'pulse',
    'heartbeat', 'glow', 'bounce', 'elastic', 'sway', 'wiggle', 'shake', 'spin', 'flip', 'flash',
] as const;

const artSchema = z
    .object({ image: mediaRefSchema, scale: z.number().min(0.4).max(2.5), animation: z.enum(ART_ANIMATIONS) })
    .strict();

export const themeDesignSchema = z
    .object({
        backgrounds: z.object({ top: backgroundSchema, content: backgroundSchema, extra: backgroundSchema }).strict(),
        art: z
            .object({
                main: artSchema.optional(),
                ceremonyIcon: artSchema.optional(),
                welcomeIcon: artSchema.optional(),
                receptionIcon: artSchema.optional(),
            })
            .strict(),
        colors: z
            .object({
                primary: colorSchema,
                secondary: colorSchema,
                text: colorSchema,
                buttonBg: colorSchema.optional(),
                buttonText: colorSchema.optional(),
            })
            .strict(),
        fonts: z
            .object({ title: fontSchema, body: fontSchema, button: fontSchema.optional() })
            .strict(),
        typographyPresetId: idSchema.optional(),
        autoTextContrast: z.boolean(),
        photoShape: z.enum(PHOTO_SHAPES),
        textAnimation: z.enum(TEXT_ANIMATIONS),
        elements: z
            .array(z.object({ id: idSchema, name: shortTextSchema, image: mediaRefSchema }).strict())
            .max(100),
        frames: z
            .array(
                z
                    .object({
                        id: idSchema,
                        name: shortTextSchema,
                        art: mediaRefSchema,
                        mask: mediaRefSchema,
                        width: z.number().min(1).max(10_000),
                        height: z.number().min(1).max(10_000),
                    })
                    .strict(),
            )
            .max(50),
        transitions: z
            .array(
                z
                    .object({ id: idSchema, name: shortTextSchema, desktop: mediaRefSchema, mobile: mediaRefSchema.optional() })
                    .strict(),
            )
            .max(50),
    })
    .strict()
    .superRefine((design, ctx) => {
        const ids = [...design.elements, ...design.frames, ...design.transitions].map((asset) => asset.id);
        if (new Set(ids).size !== ids.length) {
            ctx.addIssue({ code: 'custom', message: 'Theme asset ids must be unique' });
        }
    });

export type ThemeDesign = z.infer<typeof themeDesignSchema>;
