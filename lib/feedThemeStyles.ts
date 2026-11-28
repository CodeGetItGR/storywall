import { PLAIN_FEED_STYLE } from '@/lib/feedLayout';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';

// The background of a block that sits on the page: the theme's, as the page draws it ("auto").
export const PAGE_BACKGROUND: SectionStyle['background'] = { kind: 'theme', slot: 'auto' };

// A feed block on a theme with no matching section: the theme's background, nothing else.
export const FEED_BLOCK_FALLBACK_STYLE: SectionStyle = { ...PLAIN_FEED_STYLE, background: PAGE_BACKGROUND };
