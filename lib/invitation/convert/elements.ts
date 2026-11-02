import type { Reader } from '@/lib/invitation/convert/reader';
import { pick } from '@/lib/invitation/convert/theme';
import { clamp, cleanLink, type ConvertContext, imageRef, readTextStyle, warn } from '@/lib/invitation/convert/values';
import { FRAME_ANIMATIONS, type InvitationElement } from '@/lib/invitation/elements';

type FrameElement = Extract<InvitationElement, { kind: 'photoFrame' }>;

// One old `texts[]` entry. `allowColumns` is true for custom sections only.
export function convertElement(text: Reader, ctx: ConvertContext, allowColumns: boolean): InvitationElement | undefined {
    const id = text.str('id');
    const kind = text.str('kind');

    switch (kind) {
        case 'spacer':
            return { id, kind: 'spacer', height: clamp(text.num('height'), 0, 2000) ?? 40 };
        case 'image': {
            const image = imageRef(text.str('src'), ctx);
            if (!image) {
                warn(ctx, text.path, `image ${id} has no file and was left out`);
                return undefined;
            }
            return { id, kind: 'image', image, width: clamp(text.num('width'), 20, 2000) ?? 260 };
        }
        case 'link':
            return { id, kind: 'link', text: text.str('text'), url: cleanLink(text.str('url'), ctx, `${text.path}.url`) };
        case 'photoFrame':
            return { id, kind: 'photoFrame', ...convertFrameFields(text, ctx) };
        case 'columnBreak':
            // Its colour only tinted the editor's column marker.
            text.drop('color');
            return allowColumns ? { id, kind: 'columnBreak' } : undefined;
        default: {
            const role = kind === 'title' || kind === 'subtitle' ? kind : 'paragraph';
            if (kind && role === 'paragraph' && kind !== 'paragraph') warn(ctx, text.path, `unknown element kind "${kind}", kept as a paragraph`);
            const fullWidth = allowColumns && text.bool('fullWidth') === true ? true : undefined;
            text.raw('fullWidth');
            return { id, kind: 'text', role, text: text.str('text'), style: readTextStyle(text), ...(fullWidth && { fullWidth }) };
        }
    }
}

export function convertFrameFields(frame: Reader, ctx: ConvertContext): Omit<FrameElement, 'id' | 'kind'> {
    const photo = imageRef(frame.str('src'), ctx);
    return {
        frameId: frame.str('frameId'),
        ...(photo && { photo }),
        imageX: clamp(frame.num('imageX'), 0, 100) ?? 50,
        imageY: clamp(frame.num('imageY'), 0, 100) ?? 50,
        zoom: clamp(frame.num('zoom'), 0.1, 10) ?? 1,
        boxScale: clamp(frame.num('boxScale'), 0.1, 10) ?? 1,
        imageWidth: clamp(frame.num('imageWidth'), 0, 20_000) ?? 0,
        imageHeight: clamp(frame.num('imageHeight'), 0, 20_000) ?? 0,
        animation: pick(frame.str('frameAnimation'), FRAME_ANIMATIONS, 'none', ctx, `${frame.path}.frameAnimation`),
    };
}
