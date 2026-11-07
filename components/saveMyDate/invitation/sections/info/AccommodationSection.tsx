import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { mapsUrl, websiteUrl } from '@/lib/invitation/mapLinks';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { stayVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type AccommodationSection = Extract<InvitationSection, { type: 'accommodation' }>;
type Stay = AccommodationSection['data']['items'][number];

type AccommodationSectionProps = {
    section: AccommodationSection;
    contrast: TextContrast;
    ctx: RenderContext;
};

function listClass(count: number) {
    return ['stay-list', count > 1 && 'stay-list-multi', count > 1 && count % 2 === 1 && 'has-odd'].filter(Boolean).join(' ');
}

// Places to stay: one centred card, or two columns on wider screens.
export function AccommodationSection({ section, contrast, ctx }: AccommodationSectionProps) {
    const { data } = section;
    const count = data.items.length;

    return (
        <div className={`section-inner stay-section-inner${count > 1 ? ' has-multiple' : ''}`}>
            {/* Header */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path="subtitle" value={data.subtitle} tag="p" contrast={contrast} ctx={ctx} />
            {/* Stays */}
            <div className={listClass(count)} style={stayVars(data)}>
                {data.items.map((item) => (
                    <StayCard key={item.id} section={section} item={item} contrast={contrast} ctx={ctx} />
                ))}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type StayCardProps = {
    section: AccommodationSection;
    item: Stay;
    contrast: TextContrast;
    ctx: RenderContext;
};

function StayCard({ section, item, contrast, ctx }: StayCardProps) {
    const website = websiteUrl(item.website);
    const field = (name: 'name' | 'address' | 'phone' | 'email') => `items.${item.id}.${name}`;

    return (
        <div className="stay-item">
            {/* Details */}
            <SectionText section={section} path={field('name')} value={item.name} tag="h3" className="stay-name" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={field('address')} value={item.address} tag="p" className="stay-address" contrast={contrast} ctx={ctx} />
            {/* Contact */}
            <div className="stay-contact-row">
                <div className="stay-contact-item">
                    <svg className="stay-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M6.5 3h3l1.5 4-2 2c1 2.5 3 4.5 5.5 5.5l2-2 4 1.5v3c0 1-1 2-2 2C9.5 19 4 13.5 4 6c0-1 1-3 2.5-3Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <SectionText section={section} path={field('phone')} value={item.phone} tag="span" className="stay-phone" contrast={contrast} ctx={ctx} />
                </div>
                <div className="stay-contact-item">
                    <svg className="stay-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M4 6.5l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <SectionText section={section} path={field('email')} value={item.email} tag="span" className="stay-email" contrast={contrast} ctx={ctx} />
                </div>
            </div>
            {/* Links */}
            <div className="stay-btn-row">
                {website && (
                    <a className="theme-btn stay-website-btn" href={website} target="_blank" rel="noopener">
                        {ctx.labels.website}
                    </a>
                )}
                <a className="theme-btn stay-map-btn" href={item.mapUrl || mapsUrl(item.name, item.address)} target="_blank" rel="noopener">
                    {ctx.labels.map}
                </a>
            </div>
        </div>
    );
}
