import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { showsText } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

export type GraduatesBlock = Extract<InvitationSection, { type: 'graduates' }>;
export type Graduate = GraduatesBlock['data']['graduates'][number];

export type GraduateProps = {
    section: GraduatesBlock;
    graduate: Graduate;
    // The graduate's place in the list, from 0.
    index: number;
    contrast: TextContrast;
    ctx: RenderContext;
};

// A graduate's name.
export function GraduateNameText({ section, graduate, contrast, ctx, className }: GraduateProps & { className?: string }) {
    if (!showsText(graduate.name, ctx)) return null;
    return (
        <SectionText
            section={section}
            path={`graduates.${graduate.id}.name`}
            value={graduate.name}
            tag="h2"
            className={className}
            contrast={contrast}
            ctx={ctx}
        />
    );
}

// A graduate's degree and university: one line each, or one line together.
export function GraduateDetails({ section, graduate, contrast, ctx, joined = false }: GraduateProps & { joined?: boolean }) {
    const path = `graduates.${graduate.id}`;
    const degree = showsText(graduate.degree, ctx);
    const university = showsText(graduate.university, ctx);
    const tag = joined ? 'span' : 'small';
    const className = joined ? undefined : 'family-graduate-detail';
    const lines = (
        <>
            {degree && (
                <SectionText section={section} path={`${path}.degree`} value={graduate.degree} tag={tag} className={className} contrast={contrast} ctx={ctx} />
            )}
            {joined && degree && university && <span aria-hidden="true"> · </span>}
            {university && (
                <SectionText section={section} path={`${path}.university`} value={graduate.university} tag={tag} className={className} contrast={contrast} ctx={ctx} />
            )}
        </>
    );
    if (!joined) return lines;
    return degree || university ? <p className="grad-joined-detail">{lines}</p> : null;
}
