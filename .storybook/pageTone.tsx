import type { Decorator } from '@storybook/nextjs-vite';

import { eventThemeStyle } from '@/lib/eventTheme';
import { pageToneOf, pageToneProps, pageToneStyle } from '@/lib/pageTone';

// The story on a feed page of one colour, as EventThemeScope draws it.
export function onPage(color: string): Decorator {
    const tone = pageToneOf(color);
    return function OnPage(Story) {
        return (
            <div data-event-scope="" {...pageToneProps(tone)} className="bg-event p-4" style={{ ...eventThemeStyle(color), ...pageToneStyle(tone) }}>
                <Story />
            </div>
        );
    };
}

// A dark page (light text) and a middle colour (dark text).
export const onDarkPage = onPage('#1B2A4A');
export const onMiddlePage = onPage('#FF7A59');
