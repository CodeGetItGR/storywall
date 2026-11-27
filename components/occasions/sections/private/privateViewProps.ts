import type { PrivateViewProps } from '@/components/occasions/sections/private/PrivateView';
import type { OccasionCardCopy, PageTranslator } from '@/lib/occasions/pageCopy';

// copy: OccasionPages.<type>.private
export function privateViewProps(copy: PageTranslator): PrivateViewProps {
    return {
        cards: copy.raw('cards') as OccasionCardCopy[],
        heading: copy.raw('heading') as [string, string],
        intro: copy('intro'),
        kicker: copy('kicker'),
    };
}
