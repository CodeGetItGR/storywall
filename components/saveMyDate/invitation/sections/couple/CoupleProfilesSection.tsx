import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { CoupleProfileText } from '@/components/saveMyDate/invitation/sections/couple/CoupleProfileText';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type CoupleProfilesSectionProps = {
    section: Extract<InvitationSection, { type: 'coupleProfiles' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The couple with photos: one column on a phone, two on larger screens.
export function CoupleProfilesSection({ section, contrast, ctx }: CoupleProfilesSectionProps) {
    const { partnerA, partnerB } = section.data;

    return (
        <div className="section-inner">
            {/* Profiles */}
            <div className="couple-profiles-grid">
                {(['partnerA', 'partnerB'] as const).map((path) => {
                    const partner = path === 'partnerA' ? partnerA : partnerB;
                    return (
                        <div key={path} className="couple-profile-block">
                            <FamilyPhoto photo={partner.photo} name={partner.name} sectionId={section.id} path={`${path}.photo`} ctx={ctx} />
                            <SectionText section={section} path={`${path}.name`} value={partner.name} tag="h2" contrast={contrast} ctx={ctx} />
                            <CoupleProfileText section={section} path={path} partner={partner} contrast={contrast} ctx={ctx} />
                        </div>
                    );
                })}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
