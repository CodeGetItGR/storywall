import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { GraduateDetails, GraduateNameText, type GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlacedStickers } from '@/components/saveMyDate/invitation/sections/family/graduates/PlacedStickers';
import { showsGraduatePhoto, stickerArrangement } from '@/lib/invitation/graduatesStyles';

// Plain, with die-cut stickers around the photo, arranged by the graduate's place in the list.
export function StickerGraduate(props: GraduateProps) {
    const { section, graduate, index, ctx } = props;
    return (
        <div className="family-godparent">
            {/* Photo and stickers */}
            {showsGraduatePhoto(graduate.photo, ctx) && (
                <div className="grad-sticker-photo">
                    <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`graduates.${graduate.id}.photo`} ctx={ctx} />
                    <PlacedStickers stickers={stickerArrangement(index)} labels={ctx.labels} />
                </div>
            )}
            {/* Name */}
            <GraduateNameText {...props} />
            {/* Degree and university */}
            <GraduateDetails {...props} />
        </div>
    );
}
