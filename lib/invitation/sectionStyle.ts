import { z } from 'zod';

import { colorSchema, idSchema, imageRefSchema } from '@/lib/invitation/primitives';

export const THEME_BACKGROUND_SLOTS = ['top', 'content', 'extra'] as const;

export const BACKGROUND_EFFECTS = [
    'none', 'slowZoom', 'zoomOut', 'kenBurnsLeft', 'kenBurnsRight', 'cinematicPulse', 'drift',
    'softGlow', 'lightSweep', 'gradientFlow', 'confettiBurst', 'canvasRealistic', 'canvasFireworks',
    'canvasStars', 'canvasSnow', 'fade', 'blurReveal', 'vignettePulse', 'auroraGlow', 'shimmer',
    'spotlightSweep', 'softFog', 'lightRays', 'floatingDust', 'softSparkles', 'fallingPetals',
    'heartsDrift', 'goldenDust', 'autumnLeaves', 'christmasTwinkle', 'bokehLights',
] as const;

export const themeBackgroundSlotSchema = z.enum(THEME_BACKGROUND_SLOTS);

export const sectionBackgroundSchema = z.discriminatedUnion('kind', [
    // 'auto' alternates top/content backgrounds by section position.
    z.object({ kind: z.literal('theme'), slot: z.union([z.literal('auto'), themeBackgroundSlotSchema]) }).strict(),
    z.object({ kind: z.literal('color'), color: colorSchema }).strict(),
    z.object({ kind: z.literal('image'), image: imageRefSchema }).strict(),
]);

export const sectionStyleSchema = z
    .object({
        background: sectionBackgroundSchema,
        // The theme background 'reset' returns to; set by the admin.
        themeBackgroundDefault: z.union([z.literal('auto'), themeBackgroundSlotSchema]).optional(),
        // Which theme backgrounds the host may pick for this section.
        hostBackgrounds: z
            .object({ enabled: z.boolean(), allowed: z.array(themeBackgroundSlotSchema).max(3) })
            .strict(),
        effect: z
            .object({
                type: z.enum(BACKGROUND_EFFECTS),
                speed: z.enum(['slow', 'normal']),
                intensity: z.enum(['subtle', 'strong']),
            })
            .strict()
            .optional(),
        minHeight: z.number().min(80).max(3000).optional(),
        paddingY: z.number().min(0).max(1000).optional(),
        transition: z.object({ assetId: idSchema, edge: z.enum(['top', 'bottom']) }).strict().optional(),
        textContrast: z.enum(['auto', 'light', 'base']),
    })
    .strict();

export type SectionStyle = z.infer<typeof sectionStyleSchema>;
