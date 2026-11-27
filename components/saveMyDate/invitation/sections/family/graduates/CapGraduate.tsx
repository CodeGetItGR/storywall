import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduationCap } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/GraduationCap';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { showsGraduatePhoto } from '@/lib/invitation/graduatesStyles';

// Plain, with a cap tilted on the photo's top corner. CSS puts it left on odd graduates and right
// on even ones.
export function CapGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo and cap */}
            {showsGraduatePhoto(graduate.photo, ctx) && (
                <div className="grad-cap-photo">
                    <GraduationCap labels={ctx.labels} />
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                </div>
            )}
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
