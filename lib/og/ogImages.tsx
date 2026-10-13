import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { OG_IMAGE_SIZE } from '@/lib/seo';
import { coverImageUrl, type ShareEvent } from '@/lib/shareMetadata';

const CANVAS = '#fffaf3';
const INK = '#241f1a';
const INK_MUTED = '#8a7c70';
const CORAL = '#ff7a59';

// Alegreya is the app's display face and covers Greek, which the renderer's
// built-in font does not.
const TITLE_FONT = 'Alegreya';

async function logoDataUri(): Promise<string> {
    const logo = await readFile(path.join(process.cwd(), 'public/assets/LogoText.svg'));
    return `data:image/svg+xml;base64,${logo.toString('base64')}`;
}

// Google Fonts serves a TTF subset for just these characters when asked
// without a browser user agent.
async function loadTitleFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
    try {
        const cssUrl = `https://fonts.googleapis.com/css2?family=${TITLE_FONT}:wght@${weight}&text=${encodeURIComponent(text)}`;
        const css = await (await fetch(cssUrl)).text();
        const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
        if (!fontUrl) return null;

        const res = await fetch(fontUrl);
        return res.ok ? await res.arrayBuffer() : null;
    } catch {
        return null;
    }
}

// Read up front so an expired or missing cover falls back to the plain layout
// instead of failing the whole image.
async function loadCover(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
        const res = await fetch(url);
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;

        return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
    } catch {
        return null;
    }
}

export async function brandOgImage() {
    const logoSrc = await logoDataUri();

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 88px',
                background: CANVAS,
                color: INK,
                fontFamily: 'sans-serif',
            }}
        >
            {/* Corner accent */}
            <div
                style={{
                    position: 'absolute',
                    right: -140,
                    top: -140,
                    width: 460,
                    height: 460,
                    borderRadius: 9999,
                    background: CORAL,
                    opacity: 0.16,
                }}
            />
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot render inside ImageResponse */}
            <img alt="" height={64} src={logoSrc} width={268} />
            {/* Headline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ fontSize: 30, letterSpacing: 6, color: CORAL }}>THE SOCIAL SPACE FOR EVERY PRIVATE EVENT</div>
                <div style={{ fontSize: 88, lineHeight: 1.02, maxWidth: 980 }}>Every moment becomes part of the story.</div>
            </div>
            {/* Trust line */}
            <div style={{ display: 'flex', gap: 40, fontSize: 28, color: INK_MUTED }}>
                <span>No app</span>
                <span>From any phone</span>
                <span>Private</span>
                <span>Link or QR</span>
            </div>
        </div>,
        { ...OG_IMAGE_SIZE },
    );
}

// The partner page's preview. Uses Alegreya for the text because the built-in
// font has no Greek; falls back to the default font if Google Fonts is down.
export async function forBusinessOgImage(copy: { eyebrow: string; headline: string }) {
    const logoSrc = await logoDataUri();
    const font = await loadTitleFont(`${copy.eyebrow}${copy.headline}`, 700);

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 88px',
                background: CANVAS,
                color: INK,
                fontFamily: font ? TITLE_FONT : 'sans-serif',
            }}
        >
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot render inside ImageResponse */}
            <img alt="" height={64} src={logoSrc} width={268} />
            {/* Headline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ fontSize: 30, letterSpacing: 6, color: CORAL }}>{copy.eyebrow}</div>
                <div style={{ fontSize: 84, lineHeight: 1.04, maxWidth: 1000 }}>{copy.headline}</div>
            </div>
        </div>,
        { ...OG_IMAGE_SIZE, fonts: font ? [{ name: TITLE_FONT, data: font, weight: 700, style: 'normal' }] : undefined },
    );
}

// Served as JPEG: a photo rendered to PNG runs past a megabyte, which some
// messaging apps refuse to show as a preview. `refresh` looks the event up
// again past the cache, for when the cached cover link has expired.
export async function eventOgImage(event: ShareEvent | null, refresh?: () => Promise<ShareEvent | null>): Promise<Response> {
    const image = await (event ? eventOgPng(event, refresh) : brandOgImage());
    const png = await image.arrayBuffer();
    const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();

    return new Response(new Uint8Array(jpeg), {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
    });
}

// The event's cover photo with its name over it, or the name on the brand
// canvas when there is no usable cover.
async function eventOgPng(event: ShareEvent, refresh?: () => Promise<ShareEvent | null>) {
    const details = event.details ?? null;
    const [logoSrc, cachedCoverSrc, font, detailsFont] = await Promise.all([
        logoDataUri(),
        loadCover(coverImageUrl(event.cover)),
        loadTitleFont(event.title, 700),
        details ? loadTitleFont(details, 400) : null,
    ]);
    const coverSrc = cachedCoverSrc ?? (event.cover && refresh ? await loadCover(coverImageUrl((await refresh())?.cover ?? null)) : null);
    const titleSize = event.title.length > 36 ? 64 : 84;
    const fonts = [
        ...(font ? [{ name: TITLE_FONT, data: font, weight: 700 as const, style: 'normal' as const }] : []),
        ...(detailsFont ? [{ name: TITLE_FONT, data: detailsFont, weight: 400 as const, style: 'normal' as const }] : []),
    ];

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '56px 72px',
                background: CANVAS,
                color: coverSrc ? '#ffffff' : INK,
            }}
        >
            {/* Cover */}
            {coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- next/image cannot render inside ImageResponse
                <img
                    alt=""
                    src={coverSrc}
                    width={OG_IMAGE_SIZE.width}
                    height={OG_IMAGE_SIZE.height}
                    style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
                />
            ) : (
                <div
                    style={{
                        position: 'absolute',
                        right: -140,
                        top: -140,
                        width: 460,
                        height: 460,
                        borderRadius: 9999,
                        background: CORAL,
                        opacity: 0.16,
                    }}
                />
            )}
            {/* Shade under the title */}
            {coverSrc && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: OG_IMAGE_SIZE.width,
                        height: OG_IMAGE_SIZE.height,
                        backgroundImage: 'linear-gradient(to top, rgba(20,16,12,0.78) 0%, rgba(20,16,12,0.2) 55%, rgba(20,16,12,0) 100%)',
                    }}
                />
            )}
            {/* Logo */}
            <div style={{ display: 'flex' }}>
                <div
                    style={{
                        display: 'flex',
                        padding: coverSrc ? '14px 22px' : 0,
                        borderRadius: 9999,
                        background: coverSrc ? CANVAS : 'transparent',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot render inside ImageResponse */}
                    <img alt="" height={40} src={logoSrc} width={167} />
                </div>
            </div>
            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                    style={{
                        display: 'block',
                        fontFamily: font ? TITLE_FONT : 'sans-serif',
                        fontWeight: 700,
                        fontSize: titleSize,
                        lineHeight: 1.05,
                        maxWidth: 1040,
                        lineClamp: 3,
                    }}
                >
                    {event.title}
                </div>
                {/* When and where */}
                {details && (
                    <div
                        style={{
                            display: 'block',
                            fontFamily: detailsFont ? TITLE_FONT : 'sans-serif',
                            fontWeight: 400,
                            fontSize: 34,
                            lineHeight: 1.2,
                            maxWidth: 1040,
                            lineClamp: 2,
                            color: coverSrc ? 'rgba(255,255,255,0.9)' : INK_MUTED,
                        }}
                    >
                        {details}
                    </div>
                )}
            </div>
        </div>,
        {
            ...OG_IMAGE_SIZE,
            fonts: fonts.length > 0 ? fonts : undefined,
        },
    );
}
