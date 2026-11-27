import type { Decorator } from '@storybook/nextjs-vite';

import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// An occasion page's section as it sits on the page: the landing's tokens (fonts, gradient) and its motion toggle.
export const withOccasionPage: Decorator = (Story) => (
    <LandingMotionProvider>
        <div className={LANDING_TOKENS_CLASS}>
            <Story />
        </div>
    </LandingMotionProvider>
);
