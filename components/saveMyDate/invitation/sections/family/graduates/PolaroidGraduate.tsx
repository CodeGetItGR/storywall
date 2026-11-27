import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { PolaroidTape } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/PolaroidTape';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';

// A taped polaroid with the name in its margin; degree and university under it on one line.
// Without a photo, guests see the plain texts.
export function PolaroidGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    if (!showsGraduatePhoto(graduate.photo, ctx)) {
        return (
            <div className="family-godparent">
                {/* Name */}
                <GraduateNameText {...props} />
                {/* Degree and university */}
                <GraduateDetails {...props} joined />
            </div>
        );
    }
    return (
        <div className="family-godparent">
            {/* Polaroid */}
            <div className="grad-polaroid">
                <PolaroidTape labels={ctx.labels} />
                <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                <GraduateNameText {...props} contrast="base" />
            </div>
            {/* Degree and university */}
            <GraduateDetails {...props} joined />
        </div>
    );
}
