import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { ContactSection } from '@/components/saveMyDate/invitation/sections/contact/ContactSection';
import { CoupleContactSection } from '@/components/saveMyDate/invitation/sections/contact/CoupleContactSection';
import { CountdownSection } from '@/components/saveMyDate/invitation/sections/countdown/CountdownSection';
import { CoupleNamesSection } from '@/components/saveMyDate/invitation/sections/CoupleNamesSection';
import { CustomSection } from '@/components/saveMyDate/invitation/sections/CustomSection';
import { DateSection } from '@/components/saveMyDate/invitation/sections/date/DateSection';
import { DressCodeSection } from '@/components/saveMyDate/invitation/sections/DressCodeSection';
import { FaqSection } from '@/components/saveMyDate/invitation/sections/faq/FaqSection';
import { FooterSection } from '@/components/saveMyDate/invitation/sections/FooterSection';
import { InvitationTextSection } from '@/components/saveMyDate/invitation/sections/InvitationTextSection';
import { TopSection } from '@/components/saveMyDate/invitation/sections/TopSection';
import { type RenderContext, sectionShell, type TextContrast } from '@/lib/invitation/render';
import type { InvitationSection as Section, SectionType } from '@/lib/invitation/sections';

type InvitationSectionProps = {
    section: Section;
    // Position among all sections, hidden ones included.
    index: number;
    ctx: RenderContext;
};

// Section types not listed here are not built yet and render nothing.
const BUILT_SECTION_TYPES: ReadonlySet<SectionType> = new Set([
    'top',
    'blank',
    'photoFrame',
    'invitation',
    'coupleNames',
    'date',
    'countdown',
    'faq',
    'dressCode',
    'contact',
    'coupleContact',
    'footer',
]);

export function InvitationSection({ section, index, ctx }: InvitationSectionProps) {
    if (!BUILT_SECTION_TYPES.has(section.type)) return null;
    const shell = sectionShell(section, index, ctx);

    return (
        <section className={shell.className} style={shell.style} data-section-id={section.id}>
            <SectionContent section={section} contrast={shell.contrast} ctx={ctx} />
        </section>
    );
}

type SectionContentProps = { section: Section; contrast: TextContrast; ctx: RenderContext };

function SectionContent({ section, contrast, ctx }: SectionContentProps) {
    switch (section.type) {
        case 'top':
            return <TopSection section={section} contrast={contrast} ctx={ctx} />;
        case 'blank':
            return <CustomSection section={section} contrast={contrast} ctx={ctx} />;
        case 'invitation':
            return <InvitationTextSection section={section} contrast={contrast} ctx={ctx} />;
        case 'coupleNames':
            return <CoupleNamesSection section={section} contrast={contrast} ctx={ctx} />;
        case 'date':
            return <DateSection section={section} contrast={contrast} ctx={ctx} />;
        case 'countdown':
            return <CountdownSection section={section} contrast={contrast} ctx={ctx} />;
        case 'faq':
            return <FaqSection section={section} contrast={contrast} ctx={ctx} />;
        case 'dressCode':
            return <DressCodeSection section={section} contrast={contrast} ctx={ctx} />;
        case 'contact':
            return <ContactSection section={section} contrast={contrast} ctx={ctx} />;
        case 'coupleContact':
            return <CoupleContactSection section={section} contrast={contrast} ctx={ctx} />;
        case 'footer':
            return <FooterSection section={section} contrast={contrast} ctx={ctx} />;
        case 'photoFrame':
            return (
                <div className="section-inner">
                    <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
                </div>
            );
        default:
            return null;
    }
}
