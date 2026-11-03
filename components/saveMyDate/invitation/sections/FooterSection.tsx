import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { footerTextCss } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type FooterSectionProps = {
    section: Extract<InvitationSection, { type: 'footer' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The locked line at the bottom of every invitation, linked when the theme sets a link.
export function FooterSection({ section, contrast, ctx }: FooterSectionProps) {
    const { data } = section;
    const link = data.link.trim();
    const style = footerTextCss(data, contrast, ctx);

    return (
        <div className="section-inner">
            {link ? (
                <a className="footer-link" href={link} target="_blank" rel="noopener" style={style}>
                    {data.text}
                </a>
            ) : (
                <span style={style}>{data.text}</span>
            )}
        </div>
    );
}
