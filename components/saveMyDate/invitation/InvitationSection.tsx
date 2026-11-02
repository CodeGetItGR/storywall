import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { CustomSection } from '@/components/saveMyDate/invitation/sections/CustomSection';
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
const BUILT_SECTION_TYPES: ReadonlySet<SectionType> = new Set(['top', 'blank', 'photoFrame']);

export function InvitationSection({ section, index, ctx }: InvitationSectionProps) {
    if (!BUILT_SECTION_TYPES.has(section.type)) return null;
    const shell = sectionShell(section, index, ctx);

    return (
        <section className={shell.className} style={shell.style}>
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
