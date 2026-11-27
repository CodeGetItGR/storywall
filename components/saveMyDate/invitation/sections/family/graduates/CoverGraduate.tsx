import type { CSSProperties } from 'react';

import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlainGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/PlainGraduate';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { coverNameScale, showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';
import { showsText } from '@/lib/invitation/listContent';

// A minimal magazine cover: the photo fills the card, a thin white frame inside its edge, the
// university at the top and the name and degree at the bottom. Without a photo, guests see the
// plain texts.
export function CoverGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    if (!showsGraduatePhoto(graduate.photo, ctx)) return <PlainGraduate {...props} />;

    const path = `graduates.${graduate.id}`;
    const scale = { '--grad-name-scale': String(coverNameScale(graduate.name)) } as CSSProperties;
    return (
        <div className="family-godparent">
            <div className="grad-cover" style={scale}>
                {/* Photo */}
                <div className="grad-cover-photo">
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`${path}.photo`} ctx={ctx} />
                </div>
                <span className="grad-cover-frame" aria-hidden="true" />
                {/* University */}
                {showsText(graduate.university, ctx) && (
                    <SectionText section={section} path={`${path}.university`} value={graduate.university} tag="small" className="grad-cover-top" contrast="light" ctx={ctx} />
                )}
                {/* Name and degree */}
                <div className="grad-cover-bottom">
                    <GraduateNameText {...props} contrast="light" />
                    {showsText(graduate.degree, ctx) && (
                        <SectionText section={section} path={`${path}.degree`} value={graduate.degree} tag="small" className="grad-cover-degree" contrast="light" ctx={ctx} />
                    )}
                </div>
            </div>
        </div>
    );
}
