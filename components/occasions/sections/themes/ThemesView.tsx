import { ThemesPhone } from '@/components/occasions/sections/themes/ThemesPhone';
import { ThemeTile } from '@/components/occasions/sections/themes/ThemeTile';
import type { LandingTheme } from '@/lib/landingThemes';
import { landingClickAttributes, landingSectionAttributes } from '@/lib/landingTracking';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

export type ThemesViewProps = {
    cta: { href: string; label: string };
    heading: [string, string];
    kicker: string;
    lead: string;
    // null: no phone; the copy column takes the row.
    phone: { alt: string; caption: string; photo: OccasionPhoto } | null;
    // The live presets for the type; none (fetch failed or empty) leaves out the grid.
    tiles: { alt: string; theme: LandingTheme }[];
};

// The themes a host can pick, on a warm gradient: copy, tiles and a button, with a phone beside them from 761 px.
export function ThemesView({ cta, heading, kicker, lead, phone, tiles }: ThemesViewProps) {
    return (
        <section
            aria-labelledby="themes-title"
            className="bg-[radial-gradient(circle_at_84%_66%,rgba(242,145,77,0.3)_0%,rgba(242,145,77,0.2)_16%,rgba(242,145,77,0.08)_30%,transparent_46%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.34),transparent_34%),linear-gradient(135deg,#f7d9a8_0%,#f8d08f_26%,#f8c87f_52%,#f6be79_76%,#f4b879_100%)] px-5 pt-14.5 pb-15 text-[#151313] min-[761px]:px-[5vw] min-[761px]:pt-18 min-[761px]:pb-19.5"
            id={OCCASION_SECTION_IDS.themes}
            {...landingSectionAttributes('themes')}
        >
            <div className="mx-auto grid max-w-305 items-center gap-9 min-[761px]:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)] min-[761px]:gap-[5vw]">
                {/* Copy */}
                <div>
                    {/* Heading */}
                    <p className="mt-0 mb-4.5 text-[12px] font-black tracking-[0.15em] uppercase">{kicker}</p>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(42px,10.5vw,58px)] leading-[0.98] font-normal tracking-[-0.055em] min-[761px]:text-[clamp(54px,4.5vw,80px)]"
                        id="themes-title"
                    >
                        {heading[0]}
                        <br />
                        <strong className="font-bold">{heading[1]}</strong>
                    </h2>
                    <p className="mt-5.5 mb-0 max-w-155 text-[18px] leading-[1.5] min-[761px]:text-[clamp(19px,1.3vw,23px)]">{lead}</p>
                    {/* Tiles */}
                    {tiles.length ? (
                        <ul className="m-0 mt-7.5 grid list-none grid-cols-3 gap-3 p-0 min-[761px]:grid-cols-6">
                            {tiles.map((tile) => (
                                <ThemeTile alt={tile.alt} key={tile.theme.id} theme={tile.theme} />
                            ))}
                        </ul>
                    ) : null}
                    {/* Call to action */}
                    <a
                        className="mt-7.5 inline-flex min-h-16 max-w-full items-center gap-5.5 rounded-full bg-white pr-7.5 pl-8.5 text-[12px] font-black tracking-[0.14em] text-[#151313] uppercase no-underline shadow-[0_10px_28px_rgba(21,19,19,0.1)] focus-ring transition-transform duration-300 hover:-translate-y-0.75 motion-reduce:transition-none max-[420px]:w-full max-[420px]:justify-center"
                        href={cta.href}
                        {...landingClickAttributes({ event: 'create', placement: 'themes' })}
                    >
                        <span>{cta.label}</span>
                        <span aria-hidden="true" className="text-[24px] leading-none">
                            ↗
                        </span>
                    </a>
                </div>

                {/* Phone */}
                {phone ? <ThemesPhone alt={phone.alt} caption={phone.caption} photo={phone.photo} /> : null}
            </div>
        </section>
    );
}
