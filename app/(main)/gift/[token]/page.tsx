import type { Metadata } from 'next';

// No server prefetch: the preview is rate-limited per caller (60/min), and a
// server fetch would spend one budget shared by every visitor. The card's link
// is private, so it stays out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export { default } from './PageClient';
