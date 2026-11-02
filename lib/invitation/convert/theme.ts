import { stableHash } from '@/lib/invitation/convert/media';
import type { Reader } from '@/lib/invitation/convert/reader';
import { clamp, cleanColor, cleanFont, type ConvertContext, mediaRef, warn } from '@/lib/invitation/convert/values';
import { ART_ANIMATIONS, PHOTO_SHAPES, TEXT_ANIMATIONS, type ThemeDesign } from '@/lib/invitation/theme';

// The theme listing data that lives on the theme record, not in the design.
export type ThemeListing = {
    ogImage?: { mediaId: string };
    cardThumb?: { mediaId: string };
    productPhotos: { mediaId: string; alt: string }[];
};

export type ConvertedTheme = { design: ThemeDesign; listing: ThemeListing; presetForce?: boolean };

const SLOTS = ['top', 'content', 'extra'] as const;

// Theme element ids come from their URL, so a site and its template agree.
export function themeElementId(url: string): string {
    return `el-${stableHash(url.trim())}`;
}

export function convertTheme(theme: Reader, themeName: string, ctx: ConvertContext): ConvertedTheme {
    const path = theme.path;

    const backgrounds = Object.fromEntries(
        SLOTS.map((slot) => {
            const mode = theme.str(`${slot}BgMode`);
            return [
                slot,
                {
                    desktop: mediaRef(theme.str(`${slot}Bg`), ctx),
                    mobile: mediaRef(theme.str(`${slot}BgMobile`), ctx),
                    mode: mode === 'repeat' || mode === 'texture' ? mode : 'cover',
                    stableRepeat: theme.bool(`${slot}BgStableRepeat`) === true,
                },
            ];
        }),
    ) as ThemeDesign['backgrounds'];

    const art = (imageKey: string, scaleKey: string): ThemeDesign['art']['main'] => {
        const image = mediaRef(theme.str(imageKey), ctx);
        const scale = clamp(theme.num(scaleKey), 0.4, 2.5) ?? 1;
        const animation = pick(theme.str(`${scaleKey}Anim`), ART_ANIMATIONS, 'none', ctx, `${path}.${scaleKey}Anim`);
        return image ? { image, scale, animation } : undefined;
    };

    const elements = theme.strings('elements').map((url, index) => ({
        id: themeElementId(url),
        name: `${themeName}, διακοσμητικό ${index + 1}`,
        image: mediaRef(url, ctx)!,
    }));
    for (const url of theme.strings('elements')) ctx.themeElementIds.set(url.trim(), themeElementId(url));

    const frames = theme.list('frames').flatMap((frame) => {
        const artImage = mediaRef(frame.str('art'), ctx);
        const mask = mediaRef(frame.str('mask'), ctx);
        if (!artImage || !mask) {
            warn(ctx, frame.path, `frame ${frame.str('id')} has no art or mask and was left out`);
            return [];
        }
        return [{
            id: frame.str('id'),
            name: frame.str('name'),
            art: artImage,
            mask,
            width: clamp(frame.num('width'), 1, 10_000) ?? 1000,
            height: clamp(frame.num('height'), 1, 10_000) ?? 1000,
        }];
    });

    const transitions = theme.list('transitions').flatMap((transition) => {
        const desktop = mediaRef(transition.str('src'), ctx);
        if (!desktop) return [];
        return [{
            id: transition.str('id'),
            name: transition.str('name'),
            desktop,
            mobile: mediaRef(transition.str('mobileSrc'), ctx),
        }];
    });

    const design: ThemeDesign = {
        backgrounds,
        art: {
            main: art('mainArt', 'mainArtScale'),
            ceremonyIcon: art('churchIcon', 'churchIconScale'),
            welcomeIcon: art('welcomeIcon', 'welcomeIconScale'),
            receptionIcon: art('receptionIcon', 'receptionIconScale'),
        },
        colors: {
            primary: cleanColor(theme.str('primary')) ?? '#b8dfd3',
            secondary: cleanColor(theme.str('secondary')) ?? '#efe7ec',
            text: cleanColor(theme.str('textColor')) ?? '#2f2b2d',
            buttonBg: cleanColor(theme.str('buttonBg')),
            buttonText: cleanColor(theme.str('buttonTextColor')),
        },
        fonts: {
            title: cleanFont(theme.str('titleFont')) ?? 'Georgia,serif',
            body: cleanFont(theme.str('bodyFont')) ?? 'Arial,sans-serif',
            button: cleanFont(theme.str('buttonFont')),
        },
        typographyPresetId: theme.str('typographyPresetId') || undefined,
        autoTextContrast: theme.bool('autoTextContrast') === true,
        photoShape: pick(theme.str('photoShape'), PHOTO_SHAPES, 'rounded', ctx, `${path}.photoShape`),
        textAnimation: pick(theme.str('textAnimation'), TEXT_ANIMATIONS, 'none', ctx, `${path}.textAnimation`),
        elements,
        frames,
        transitions,
    };

    const alts = theme.strings('productPhotoAlts');
    const listing: ThemeListing = {
        ogImage: mediaRef(theme.str('ogImage'), ctx),
        cardThumb: mediaRef(theme.str('cardThumb'), ctx),
        productPhotos: theme.strings('productPhotos').flatMap((url, index) => {
            const ref = mediaRef(url, ctx);
            return ref ? [{ ...ref, alt: alts[index] ?? '' }] : [];
        }),
    };

    // Read from the theme record and the preset instead.
    theme.drop('name', 'typographyPresetName');
    // The opening envelope is switched off in every exported state.
    theme.drop('openingEnvelopeEnabled', 'openingEnvelopeBackground', 'openingEnvelopeBody', 'openingEnvelopeFlap', 'openingEnvelopeSeal');
    if (theme.bool('openingEnvelopeEnabled')) warn(ctx, path, 'the opening envelope was on and is not converted');

    return { design: stripUndefined(design), listing, presetForce: theme.bool('typographyPresetForce') };
}

export function pick<T extends string>(
    value: string,
    allowed: readonly T[],
    fallback: T,
    ctx: ConvertContext,
    path: string,
): T {
    if (!value) return fallback;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    warn(ctx, path, `unknown value "${value}", used "${fallback}"`);
    return fallback;
}

function stripUndefined<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
