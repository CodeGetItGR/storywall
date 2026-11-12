import type { CSSProperties, ReactNode } from 'react';

type ThemeArtImageProps = {
    className: string;
    src: string;
    alt: string;
    style: CSSProperties;
    // The editor's size dot. With it, the image sits in a box of its own size so the dot
    // lands on its corner; guests get the bare image.
    handle?: ReactNode;
};

// A theme art (main illustration, place icon) at its size.
export function ThemeArtImage({ className, src, alt, style, handle }: ThemeArtImageProps) {
    if (!handle) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img className={className} src={src} alt={alt} style={style} />;
    }

    return (
        <span className="relative mx-auto block" style={{ width: style.width }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={className} src={src} alt={alt} style={{ ...style, width: '100%' }} />
            {handle}
        </span>
    );
}
