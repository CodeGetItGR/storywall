import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type CoupleProfileTextProps = {
    section: Extract<InvitationSection, { type: 'coupleProfiles' | 'coupleProfilesSimple' }>;
    path: 'partnerA' | 'partnerB';
    partner: { role: string; familyLabel: string; familyNames: string };
    contrast: TextContrast;
    ctx: RenderContext;
};

// The lines under a partner's name.
export function CoupleProfileText({ section, path, partner, contrast, ctx }: CoupleProfileTextProps) {
    return (
        <>
            <SectionText section={section} path={`${path}.role`} value={partner.role} tag="p" className="couple-profile-role" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${path}.familyLabel`} value={partner.familyLabel} tag="p" className="couple-profile-family-label" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${path}.familyNames`} value={partner.familyNames} tag="p" className="couple-profile-family-names" contrast={contrast} ctx={ctx} />
        </>
    );
}
