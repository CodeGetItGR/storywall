import { useTranslations } from 'next-intl';

import { type CelebrationCard, EventCelebration } from '@/components/celebration/EventCelebration';

type CheckoutCelebrationProps = { card: CelebrationCard | null; feedHref: string; inviteHref: string };

// After a draft's first payment: the event card, "Your event is live", and where to go next.
export function CheckoutCelebration({ card, feedHref, inviteHref }: CheckoutCelebrationProps) {
    const t = useTranslations('CheckoutSuccessPage.celebration');

    return <EventCelebration card={card} heading={t('heading')} line={t('line')} feedHref={feedHref} inviteHref={inviteHref} />;
}
