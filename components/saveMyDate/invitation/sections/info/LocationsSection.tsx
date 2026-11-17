import { useTranslations } from 'next-intl';

import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { ThemeArtImage } from '@/components/saveMyDate/invitation/sections/ThemeArtImage';
import { mapsUrl } from '@/lib/invitation/mapLinks';
import { artAnimationClass, artImageStyle, type RenderContext, type TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

const ICON_BASE = 110;

type LocationsSection = Extract<InvitationSection, { type: 'locations' }>;

type LocationsSectionProps = {
    section: LocationsSection;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Where the event happens. On phones the note sits after the first place; on
// wider screens CSS moves it below all of them.
export function LocationsSection({ section, contrast, ctx }: LocationsSectionProps) {
    const { data } = section;
    const count = data.welcomeEnabled ? 3 : 2;
    const card = { section, contrast, ctx };

    return (
        <div className="section-inner">
            {/* Places */}
            <div className={`location-grid count-${count}`}>
                <LocationCard {...card} place="ceremony" />
                <div className="location-note">
                    <SectionText section={section} path="note" value={data.note} tag="p" contrast={contrast} ctx={ctx} />
                </div>
                {data.welcomeEnabled && <LocationCard {...card} place="welcome" />}
                <LocationCard {...card} place="reception" />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type LocationCardProps = {
    section: LocationsSection;
    place: 'ceremony' | 'welcome' | 'reception';
    contrast: TextContrast;
    ctx: RenderContext;
};

const ITEM_CLASS = { ceremony: 'church', welcome: 'welcome', reception: 'reception' };

function LocationCard({ section, place, contrast, ctx }: LocationCardProps) {
    const t = useTranslations('InvitationRenderer');
    const { data } = section;
    const name = data[place];
    const address = data[`${place}Address`];
    const art = ctx.theme.art[`${place}Icon`];
    const src = art && ctx.media(art.image.mediaId);

    return (
        <div className={`location-item location-item-${ITEM_CLASS[place]}`}>
            {/* Icon */}
            {art && src && (
                <div className="wedart-asset-wrap">
                    <ThemeArtImage
                        className={['icon', artAnimationClass(art.animation)].filter(Boolean).join(' ')}
                        src={src}
                        alt={name.trim() || t('imageAlt')}
                        style={artImageStyle(ICON_BASE, art.scale, true)}
                        handle={place === 'ceremony' ? ctx.canvasTools?.art?.('ceremonyIcon', art.scale) : undefined}
                    />
                </div>
            )}
            {/* Details */}
            <SectionText section={section} path={place} value={name} tag="h3" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${place}Address`} value={address} tag="p" contrast={contrast} ctx={ctx} />
            {/* Map */}
            <div className="location-map-row">
                <a className="theme-btn" href={data[`${place}Map`] || mapsUrl(name, address)} target="_blank" rel="noopener">
                    {ctx.labels.map}
                </a>
            </div>
        </div>
    );
}
