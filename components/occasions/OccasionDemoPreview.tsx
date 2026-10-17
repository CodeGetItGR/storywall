import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { DemoPreview } from '@/lib/occasions/demoPreview';

// A server-rendered snapshot of the occasion's demo, under the demo band's link to the live one.
export async function OccasionDemoPreview({ locale, preview }: { locale: Locale; preview: DemoPreview }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.demo' });

    return (
        <div className="mt-12 flex flex-col gap-8 border-t border-[#151313]/18 pt-10 min-[761px]:mt-16 min-[761px]:pt-12">
            {/* Posts */}
            {preview.posts.length > 0 ? (
                <ul aria-label={t('postsLabel')} className="m-0 grid list-none gap-4 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-5">
                    {preview.posts.map((post) => (
                        <li className="overflow-hidden rounded-[22px] bg-white p-1.5 shadow-[0_18px_36px_-24px_rgba(70,38,24,0.45)]" key={post.id}>
                            <Image
                                alt=""
                                className="aspect-[4/3] h-auto w-full rounded-2xl object-cover"
                                height={post.photo.height}
                                sizes="(min-width: 761px) 30vw, 100vw"
                                src={post.photo.src}
                                width={post.photo.width}
                            />
                            <div className="px-3 pt-3 pb-2.5">
                                <p className="m-0 text-xs font-bold">{post.author}</p>
                                <p className="mt-1 mb-0 line-clamp-3 text-sm leading-[1.5] text-[#151313]/80">{post.content}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}

            {/* Photos */}
            {preview.photos.length > 0 ? (
                <ul aria-label={t('photosLabel')} className="m-0 grid list-none grid-cols-3 gap-1.5 p-0 min-[761px]:grid-cols-6">
                    {preview.photos.map((photo) => (
                        <li key={photo.src}>
                            <Image
                                alt=""
                                className="aspect-square h-auto w-full rounded-xl object-cover"
                                height={photo.height}
                                sizes="(min-width: 761px) 16vw, 33vw"
                                src={photo.src}
                                width={photo.width}
                            />
                        </li>
                    ))}
                </ul>
            ) : null}

            {/* Wishes */}
            {preview.wishes.length > 0 ? (
                <ul aria-label={t('wishesLabel')} className="m-0 grid list-none gap-4 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-5">
                    {preview.wishes.map((wish) => (
                        <li className="rounded-[22px] bg-white/70 p-5" key={wish.id}>
                            <blockquote className="m-0 [font-family:var(--editorial)] text-xl leading-[1.35]">{wish.message}</blockquote>
                            <p className="mt-3 mb-0 text-xs font-bold text-[#151313]/70">{wish.guestName}</p>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
