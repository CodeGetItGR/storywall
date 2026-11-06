import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type PhotoPeopleSectionProps = {
    section: Extract<InvitationSection, { type: 'godparents' | 'weddingSponsors' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Godparents or wedding sponsors: a title and any number of people with photos.
export function PhotoPeopleSection({ section, contrast, ctx }: PhotoPeopleSectionProps) {
    const list =
        section.type === 'godparents'
            ? { titlePath: 'godparentsTitle', title: section.data.godparentsTitle, path: 'godparents', people: section.data.godparents }
            : { titlePath: 'sponsorsTitle', title: section.data.sponsorsTitle, path: 'sponsors', people: section.data.sponsors };

    return (
        <div className="section-inner">
            <div className="family-block family-godparents">
                {/* Title */}
                <SectionText section={section} path={list.titlePath} value={list.title} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                {/* People */}
                <div className="family-godparents-list">
                    {list.people.map((person) => (
                        <div key={person.id} className="family-godparent">
                            <FamilyPhoto photo={person.photo} name={person.name} ctx={ctx} />
                            <SectionText section={section} path={`${list.path}.${person.id}.name`} value={person.name} tag="h2" contrast={contrast} ctx={ctx} />
                        </div>
                    ))}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
