import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { qrLinkAttributes } from '@/lib/linkClicks';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

type WhyQrStepsProps = {
    alt: string;
    photo: OccasionPhoto;
    // The QR wedding page while it is live; the first step links to it.
    qrHref: string | null;
    steps: { body: ReactNode; title: string }[];
};

// A guest scanning the table QR, an arrow, then the three steps from scan to album. Stacked up to 900 px.
export function WhyQrSteps({ alt, photo, qrHref, steps }: WhyQrStepsProps) {
    return (
        <div className="mx-auto mb-8.5 flex max-w-280 flex-col items-stretch px-5 min-[901px]:mb-11 min-[901px]:flex-row min-[901px]:items-center min-[901px]:px-10">
            {/* Photo */}
            <ProtectedImage
                alt={alt}
                className="aspect-[4/3] h-auto w-full rounded-[22px] object-cover shadow-[0_16px_34px_rgba(60,40,25,0.16)] min-[901px]:h-56.25 min-[901px]:w-75 min-[901px]:flex-none"
                height={photo.height}
                loading="lazy"
                sizes="(min-width: 901px) 300px, calc(100vw - 76px)"
                src={photo.src}
                width={photo.width}
            />
            <span
                aria-hidden="true"
                className="hidden flex-none basis-22.5 text-center [font-family:var(--editorial)] text-[54px] leading-none font-light text-[rgba(240,150,130,0.45)] min-[901px]:block"
            >
                →
            </span>
            {/* Steps */}
            <ol className="m-0 mt-4.5 flex list-none flex-col p-0 min-[901px]:mt-0 min-[901px]:flex-1 min-[901px]:flex-row">
                {steps.map((step, index) => (
                    <li
                        className="min-w-0 border-t border-[#151313]/14 px-0.5 py-4 min-[901px]:flex-1 min-[901px]:border-t-0 min-[901px]:border-l min-[901px]:px-6.5 min-[901px]:py-1 min-[901px]:first:border-l-0"
                        key={step.title}
                    >
                        <span
                            aria-hidden="true"
                            className="[background-image:var(--brand-gradient)] bg-clip-text text-[12px] font-extrabold tracking-[0.08em] text-transparent"
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="mt-2 mb-1.5 [font-family:var(--editorial)] text-[25px] leading-[1.1] font-normal tracking-[-0.025em]">
                            {index === 0 && qrHref ? (
                                <a className="text-inherit no-underline underline-offset-3 focus-ring hover:underline" href={qrHref} {...qrLinkAttributes('why')}>
                                    {step.title}
                                </a>
                            ) : (
                                step.title
                            )}
                        </h3>
                        <p className="m-0 text-[14px] leading-[1.45] text-[#5f5a55]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}
