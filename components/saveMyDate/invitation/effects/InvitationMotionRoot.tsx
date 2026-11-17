'use client';

import { type CSSProperties, type ReactNode, useRef } from 'react';

import { useTextReveal } from '@/hooks/useTextReveal';
import { type TextAnimation,textAnimationRootClasses } from '@/lib/invitation/textReveal';

type InvitationMotionRootProps = {
    textAnimation: TextAnimation;
    lang: string;
    className: string;
    style: CSSProperties;
    children: ReactNode;
};

// The invitation's root element, which also plays the theme's text animation.
export function InvitationMotionRoot({ textAnimation, lang, className, style, children }: InvitationMotionRootProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    useTextReveal(rootRef, textAnimation);

    return (
        <div ref={rootRef} lang={lang} className={[className, textAnimationRootClasses(textAnimation)].filter(Boolean).join(' ')} style={style}>
            {children}
        </div>
    );
}
