'use client';

import type { CSSProperties } from 'react';

import { useSectionEffect } from '@/hooks/useSectionEffect';
import { effectClassName, type SectionEffect } from '@/lib/invitation/backgroundEffects';
import { isCanvasEffect } from '@/lib/invitation/canvasEffects';

type SectionEffectLayerProps = {
    effect: SectionEffect;
    // The section's own background, which this layer paints and moves.
    backgroundStyle: CSSProperties;
    hasThemeImage: boolean;
};

// The background effect behind a section's content (old wedartSectionBgLayerHtml).
export function SectionEffectLayer({ effect, backgroundStyle, hasThemeImage }: SectionEffectLayerProps) {
    const { layerRef, backgroundRef, canvasRef, inView, particles } = useSectionEffect(effect);
    const className = ['wedart-section-bg-clip', effectClassName(effect), inView && 'wedart-bg-inview'].filter(Boolean).join(' ');

    return (
        <div ref={layerRef} className={className} aria-hidden="true">
            {/* Background */}
            <div ref={backgroundRef} className={hasThemeImage ? 'wedart-section-bg has-theme-bg' : 'wedart-section-bg'} style={backgroundStyle} />
            <div className="wedart-section-bg-overlay" />

            {/* CSS particles */}
            {particles.length > 0 && (
                <div className="wedart-bg-particles">
                    {particles.map((particle, index) => (
                        <span key={index} style={particle.style}>
                            {particle.glyph}
                        </span>
                    ))}
                </div>
            )}

            {/* Canvas */}
            {isCanvasEffect(effect.type) && <canvas ref={canvasRef} className="wedart-fx-canvas" />}
        </div>
    );
}
