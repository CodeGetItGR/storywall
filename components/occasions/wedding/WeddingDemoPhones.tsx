import { DemoFeedScreen } from '@/components/occasions/wedding/demo/DemoFeedScreen';
import { DemoProfileScreen } from '@/components/occasions/wedding/demo/DemoProfileScreen';
import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import type { Locale } from '@/i18n/config';
import type { WeddingDemoFeedCopy, WeddingDemoProfileCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_DEMO_MEDIA } from '@/lib/occasions/weddingMedia';

type WeddingDemoPhonesProps = {
    feed: WeddingDemoFeedCopy;
    locale: Locale;
    mock: WeddingMockCopy;
    profile: WeddingDemoProfileCopy;
};

// The demo section's picture, drawn: the profile menu phone, and the feed phone in front of it.
export function WeddingDemoPhones({ feed, locale, mock, profile }: WeddingDemoPhonesProps) {
    return (
        <div className="relative aspect-[1115/1120] w-[min(620px,118vw)] max-w-none translate-x-[-2vw] min-[761px]:w-[min(720px,37vw)] min-[761px]:translate-x-0 min-[761px]:translate-y-[10px]">
            <MockPhone className="absolute top-[14.5%] left-[17%] w-[40%] -rotate-9">
                <DemoProfileScreen copy={profile} locale={locale} photo={WEDDING_DEMO_MEDIA.profile} />
            </MockPhone>
            <MockPhone className="absolute top-[1.5%] left-[52%] w-[40%] rotate-10">
                <DemoFeedScreen copy={feed} media={WEDDING_DEMO_MEDIA} mock={mock} />
            </MockPhone>
        </div>
    );
}
