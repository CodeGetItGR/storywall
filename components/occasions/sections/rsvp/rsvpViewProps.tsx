import type { ReactNode } from 'react';

import type { RsvpViewProps } from '@/components/occasions/sections/rsvp/RsvpView';
import type { OccasionCardCopy, PageTranslator } from '@/lib/occasions/pageCopy';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

// rsvp: OccasionPages.<type>.rsvp. The intro may bold a few words (<b>).
export function rsvpViewProps(rsvp: PageTranslator, pictures: OccasionRsvpPictures): RsvpViewProps {
    return {
        alts: { both: rsvp('alts.both'), with: rsvp('alts.with'), without: rsvp('alts.without') },
        checklist: { items: rsvp.raw('checklist.items') as OccasionCardCopy[], pill: rsvp('checklist.pill') },
        heading: rsvp.raw('heading') as [string, string],
        intro: rsvp.rich('intro', { b: (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong> }),
        kicker: rsvp('kicker'),
        pictures,
    };
}
