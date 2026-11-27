import type { CSSProperties } from 'react';

import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { EventPlace } from '@/lib/invitation/eventPlaces';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type LocationsSection = Extract<InvitationSection, { type: 'locations' }>;

type EventPlacesSectionProps = {
    section: LocationsSection;
    places: readonly EventPlace[];
    contrast: TextContrast;
    ctx: RenderContext;
};

// One place takes the whole width; more sit two in a row on wider screens.
const ONE_COLUMN: CSSProperties = { gridTemplateColumns: 'minmax(0, 1fr)' };

// The feed's Places (KAN-293): each place of the event's sessions once, from the event, never typed here. The
// sessions held there sit above, then the place, its address and the theme's map button. The texts take the
// section's own styles: the note's for the sessions, the first place's for the rest.
export function EventPlacesSection({ section, places, contrast, ctx }: EventPlacesSectionProps) {
    // The event's values read as plain text, even in edit mode.
    const plain: RenderContext = { ...ctx, renderText: undefined };
    const text = { section, contrast, ctx: plain };

    return (
        <div className="section-inner">
            {/* Places */}
            <div className="location-grid" style={places.length === 1 ? ONE_COLUMN : undefined}>
                {places.map((place) => (
                    <div key={place.key} className="location-item">
                        {/* Sessions */}
                        {place.sessions.length > 0 && <SectionText {...text} path="note" value={place.sessions.join(' · ')} tag="p" />}

                        {/* Place */}
                        {place.name && <SectionText {...text} path="ceremony" value={place.name} tag="h3" />}
                        {place.address && <SectionText {...text} path="ceremonyAddress" value={place.address} tag="p" />}

                        {/* Map */}
                        <div className="location-map-row">
                            <a className="theme-btn" href={place.mapUrl} target="_blank" rel="noopener">
                                {ctx.labels.map}
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
