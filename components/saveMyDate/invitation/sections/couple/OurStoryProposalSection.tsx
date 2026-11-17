import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type Section = Extract<InvitationSection, { type: 'ourStoryProposal' }>;

type OurStoryProposalSectionProps = {
    section: Section;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The couple's story in two blocks with a line between them.
export function OurStoryProposalSection({ section, contrast, ctx }: OurStoryProposalSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* First block */}
            <StoryBlock section={section} prefix="block1" title={data.block1Title} subtitle={data.block1Subtitle} body={data.block1Body} contrast={contrast} ctx={ctx} />
            {/* Divider */}
            <hr className="story-proposal-divider" />
            {/* Second block */}
            <StoryBlock section={section} prefix="block2" title={data.block2Title} subtitle={data.block2Subtitle} body={data.block2Body} contrast={contrast} ctx={ctx} />
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type StoryBlockProps = {
    section: Section;
    prefix: 'block1' | 'block2';
    title: string;
    subtitle: string;
    body: string;
    contrast: TextContrast;
    ctx: RenderContext;
};

function StoryBlock({ section, prefix, title, subtitle, body, contrast, ctx }: StoryBlockProps) {
    return (
        <div className="story-proposal-block">
            <SectionText section={section} path={`${prefix}Title`} value={title} tag="h2" className="story-block-title" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${prefix}Subtitle`} value={subtitle} tag="p" className="story-block-subtitle" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${prefix}Body`} value={body} tag="div" className="story-block-body" contrast={contrast} ctx={ctx} />
        </div>
    );
}
