import { giftClaimUrl } from '@/lib/gift';

// Storybook's stand-in (see .storybook/preview.tsx): a fixed origin, so a gift
// card's QR doesn't change with the address Storybook is served from and the
// visual check doesn't flag it.
export function useGiftClaimUrl(token: string | null | undefined): string | null {
    return token ? giftClaimUrl('https://www.storywall.gr', token) : null;
}
