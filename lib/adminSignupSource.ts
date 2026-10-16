import type { SignupSourceDto } from '@/lib/api/types';

// The part after the channel in the account drawer: "instagram / bio-link", else the referring site.
export function signupSourceDetail(source: SignupSourceDto): string | null {
    const campaign = [source.utmSource, source.utmCampaign].filter(Boolean).join(' / ');
    return campaign || source.referrerHost || null;
}
