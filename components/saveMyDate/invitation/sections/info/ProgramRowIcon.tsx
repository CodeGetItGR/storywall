import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

import { ProgramIconGlyph } from '@/components/saveMyDate/invitation/sections/info/ProgramIconGlyph';
import { programIconKeyForLabel } from '@/lib/invitation/programIcons';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type ProgramIcon = Extract<InvitationSection, { type: 'programIcons' }>['data']['items'][number]['icon'];

type ProgramRowIconProps = {
    icon: ProgramIcon;
    // The row's label, which picks an automatic icon and describes a custom one.
    label: string;
    ctx: RenderContext;
};

// A schedule row's icon: built-in, picked from its label, or the host's own.
export function ProgramRowIcon({ icon, label, ctx }: ProgramRowIconProps) {
    const t = useTranslations('InvitationRenderer');

    if (icon.kind === 'none') return null;
    if (icon.kind === 'preset') return <ProgramIconGlyph icon={icon.key} />;
    if (icon.kind === 'auto') return <ProgramIconGlyph icon={programIconKeyForLabel(label)} />;

    const src = resolveImage(icon.image, ctx);
    if (!src) return null;
    if (icon.mode === 'mask') {
        const style = { '--program-custom-icon': `url('${src.replace(/'/g, '%27')}')` } as CSSProperties;
        return <span className="program-icons-custom-mask" style={style} />;
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="program-icons-custom-img" src={src} alt={label.trim() || t('imageAlt')} />;
}
