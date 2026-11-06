import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { CoupleProfileText } from '@/components/saveMyDate/invitation/sections/couple/CoupleProfileText';
import { FamilyDecoration } from '@/components/saveMyDate/invitation/sections/family/FamilyDecoration';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type Section = Extract<InvitationSection, { type: 'coupleProfilesSimple' }>;

type CoupleProfilesSimpleSectionProps = {
    section: Section;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The couple without photos, stacked with a decoration between them.
export function CoupleProfilesSimpleSection({ section, contrast, ctx }: CoupleProfilesSimpleSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            <div className="couple-profiles-simple-wrap">
                {/* First partner */}
                <SimpleProfile section={section} path="partnerA" partner={data.partnerA} contrast={contrast} ctx={ctx} />
                {/* Decoration */}
                <FamilyDecoration decoration={data.decoration} ctx={ctx} />
                {/* Second partner */}
                <SimpleProfile section={section} path="partnerB" partner={data.partnerB} contrast={contrast} ctx={ctx} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type SimpleProfileProps = {
    section: Section;
    path: 'partnerA' | 'partnerB';
    partner: Section['data']['partnerA'];
    contrast: TextContrast;
    ctx: RenderContext;
};

function SimpleProfile({ section, path, partner, contrast, ctx }: SimpleProfileProps) {
    return (
        <div className="couple-profile-simple-block">
            <SectionText section={section} path={`${path}.name`} value={partner.name} tag="h2" className="couple-profile-simple-name" contrast={contrast} ctx={ctx} />
            <CoupleProfileText section={section} path={path} partner={partner} contrast={contrast} ctx={ctx} />
        </div>
    );
}
