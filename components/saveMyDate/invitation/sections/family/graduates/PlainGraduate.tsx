import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';

// Today's look: the photo, then name, degree and university.
export function PlainGraduate(props: GraduateProps) {
    const { section, graduate, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo */}
            <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
