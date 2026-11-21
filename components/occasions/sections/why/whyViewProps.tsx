import type { ReactNode } from 'react';

import type { WhyViewProps } from '@/components/occasions/sections/why/WhyView';
import type { OccasionGuestPhotoCopy, OccasionStatCopy, PageTranslator } from '@/lib/occasions/pageCopy';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type WhyViewPropsInput = {
    // ImageAlt
    imageAlt: PageTranslator;
    layout: 'marquee' | 'row';
    media: OccasionPageMedia;
    qrHref: string | null;
    // OccasionPages.<type>.why
    why: PageTranslator;
};

export function whyViewProps({ imageAlt, layout, media, qrHref, why }: WhyViewPropsInput): WhyViewProps {
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const photos = why.raw('with.marquee') as OccasionGuestPhotoCopy[];

    return {
        heading: why.raw('heading') as [string, string],
        kicker: why('kicker'),
        without: {
            bubbles: why.raw('without.bubbles') as [string, string],
            items: why.raw('without.items') as string[],
            label: why('without.label'),
            photos: media.withoutPhotos,
        },
        with: {
            label: why('with.label'),
            subtitle: why('with.subtitle'),
            qr: {
                alt: why('with.qrAlt'),
                href: qrHref,
                photo: media.qrPhoto,
                steps: (why.raw('with.steps') as { title: string }[]).map((step, index) => ({
                    title: step.title,
                    body: why.rich(`with.steps.${index}.body`, { b: bold }),
                })),
            },
            guestPhotos: {
                layout,
                tiles: photos.map((copy, index) => ({
                    ...media.guestPhotos[index]!,
                    // The whole alt when the copy gives one, else built from its moment, name and role.
                    alt: copy.alt ?? why('with.photoAlt', copy),
                    avatarAlt: imageAlt('profilePhotoOf', { name: copy.name }),
                    name: copy.name,
                    role: copy.role,
                })),
            },
            stats: {
                chips: why.raw('with.chips') as string[],
                example: why('with.example'),
                stats: why.raw('with.stats') as OccasionStatCopy[],
            },
        },
    };
}
