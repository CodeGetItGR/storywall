import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { OG_IMAGE_SIZE } from '@/lib/seo';

// Rendered once at build time and served at /opengraph-image for every locale.
// Copy stays in English on purpose — the artwork is the same in both languages.
export const alt = 'StoryWall — the social space for every private event';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

const CANVAS = '#fffaf3';
const INK = '#241f1a';
const INK_MUTED = '#8a7c70';
const CORAL = '#ff7a59';

export default async function OpenGraphImage() {
    const logo = await readFile(path.join(process.cwd(), 'public/assets/LogoText.svg'));
    const logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`;

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
        { ...size },
    );
}
