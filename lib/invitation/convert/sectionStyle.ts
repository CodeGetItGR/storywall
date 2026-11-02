import type { Reader } from '@/lib/invitation/convert/reader';
import { pick } from '@/lib/invitation/convert/theme';
import { clamp, cleanColor, type ConvertContext, imageRef } from '@/lib/invitation/convert/values';
import { BACKGROUND_EFFECTS, type SectionStyle } from '@/lib/invitation/sectionStyle';

type Slot = 'top' | 'content' | 'extra';

const OLD_SLOTS: Record<string, Slot> = { topBg: 'top', contentBg: 'content', extraBg: 'extra' };

// The old sanitizer renamed these two effects.
const RENAMED_EFFECTS: Record<string, string> = { parallax: 'cinematicPulse', tsFireworks: 'canvasFireworks' };

function slotOrAuto(value: string): Slot | 'auto' {
    return OLD_SLOTS[value] ?? 'auto';
}

export function convertSectionStyle(style: Reader, ctx: ConvertContext, hasColumnBreak: boolean): SectionStyle {
    const mode = style.str('mode');
    const color = style.str('color');
    const image = style.str('image');
    let background: SectionStyle['background'] = { kind: 'theme', slot: slotOrAuto(style.str('themeBg')) };
    if (mode === 'color') background = { kind: 'color', color: cleanColor(color) };
    if (mode === 'image') {
        const ref = imageRef(image, ctx);
        if (ref) background = { kind: 'image', image: ref };
    }

    // Not configured meant every theme background was allowed.
    const configured = style.bool('clientThemeBgConfigured') === true;
    const enabled = style.bool('clientThemeBgEnabled');
    const allowed = style.strings('clientThemeBgAllowed').map((value) => OLD_SLOTS[value]).filter(Boolean);
    const hostBackgrounds = configured
        ? { enabled: enabled === true, allowed: [...new Set(allowed)] }
        : { enabled: true, allowed: ['top', 'content', 'extra'] as Slot[] };

    const effectReader = style.obj('bgEffect');
    const effectType = effectReader.str('type');
    // Read even with no effect: the old editor kept them after switching it off.
    const speed = effectReader.str('speed') === 'normal' ? ('normal' as const) : ('slow' as const);
    const intensity = effectReader.str('intensity') === 'strong' ? ('strong' as const) : ('subtle' as const);
    const effect = effectType && effectType !== 'none'
        ? {
            type: pick(RENAMED_EFFECTS[effectType] ?? effectType, BACKGROUND_EFFECTS, 'none', ctx, `${effectReader.path}.type`),
            speed,
            intensity,
        }
        : undefined;

    // The old editor dropped the stacked-layout height of custom sections
    // that got columns before its v2 fix.
    const staleColumnHeight = hasColumnBreak && (style.num('columnLayoutVersion') ?? 0) < 2;
    const minHeight = staleColumnHeight ? undefined : clamp(style.num('minHeight'), 80, 3000);
    const paddingY = staleColumnHeight ? undefined : clamp(style.num('paddingY'), 0, 1000);

    const transition = style.obj('transition');
    const assetId = transition.str('assetId');
    const textContrast = style.str('textContrast');

    const out: SectionStyle = {
        background,
        themeBackgroundDefault: style.has('themeBgDefault') ? slotOrAuto(style.str('themeBgDefault')) : undefined,
        hostBackgrounds,
        effect: effect?.type === 'none' ? undefined : effect,
        minHeight,
        paddingY,
        transition: assetId
            ? { assetId, edge: transition.str('edge') === 'top' ? 'top' : 'bottom' }
            : undefined,
        textContrast: textContrast === 'light' || textContrast === 'base' ? textContrast : 'auto',
    };
    return JSON.parse(JSON.stringify(out)) as SectionStyle;
}
