import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { OccasionSectionHeading } from '@/components/occasions/OccasionSectionHeading';
import type { Locale } from '@/i18n/config';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import type { DemoPreview } from '@/lib/occasions/demoPreview';
import type { Occasion } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';

export async function OccasionDemoPreview({ locale, occasion, preview }: { locale: Locale; occasion: Occasion; preview: DemoPreview }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.demo' });

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            {/* Heading */}
            <OccasionSectionHeading>{t('heading')}</OccasionSectionHeading>

            {/* Posts */}
            {preview.posts.length > 0 ? (
                <div aria-label={t('postsLabel')} className="mt-8" role="group">
                    <div className="grid gap-5 min-[761px]:grid-cols-3">
                        {preview.posts.map((post) => (
                            <article className="overflow-hidden rounded-2xl border border-[var(--occasion-line)] bg-white p-1.5" key={post.id}>
                                <Image
                                    alt=""
                                    className="aspect-[4/3] h-auto w-full rounded-xl object-cover"
                                    height={post.photo.height}
                                    sizes="(min-width: 761px) 30vw, 100vw"
                                    src={post.photo.src}
                                    width={post.photo.width}
                                />
                                <div className="px-3 pt-3 pb-2.5">
                                    <p className="m-0 text-xs font-bold">{post.author}</p>
                                    <p className="mt-1 mb-0 line-clamp-3 text-sm leading-[1.5] text-[#3d3836]">{post.content}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Photos */}
            {preview.photos.length > 0 ? (
                <div aria-label={t('photosLabel')} className="mt-8 grid grid-cols-3 gap-1.5 min-[761px]:grid-cols-6" role="group">
                    {preview.photos.map((photo) => (
                        <Image
                            alt=""
                            className="aspect-square h-auto w-full rounded-lg object-cover"
                            height={photo.height}
                            key={photo.src}
                            sizes="(min-width: 761px) 16vw, 33vw"
                            src={photo.src}
                            width={photo.width}
                        />
                    ))}
                </div>
            ) : null}

            {/* Wishes */}
            {preview.wishes.length > 0 ? (
                <ul aria-label={t('wishesLabel')} className="mt-8 grid list-none gap-5 p-0 min-[761px]:grid-cols-3">
                    {preview.wishes.map((wish) => (
                        <li className="rounded-2xl border border-[var(--occasion-line)] bg-white p-5" key={wish.id}>
                            <blockquote className="m-0 [font-family:var(--editorial)] text-xl leading-[1.35]">{wish.message}</blockquote>
                            <p className="mt-3 mb-0 text-xs font-bold text-[#6b625e]">{wish.guestName}</p>
                        </li>
                    ))}
                </ul>
            ) : null}

            {/* Demo link */}
            <a
                className="mt-10 inline-flex min-h-13 items-center rounded-full border border-[#151313] px-7 text-[15px] font-bold text-[#151313] no-underline transition hover:bg-white"
                href={routes.demoEventType(eventTypeSlug(occasion.eventType))}
            >
                {t('tryDemo')}
            </a>
        </section>
    );
}
