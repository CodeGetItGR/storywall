import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// A phone in a dark frame showing one event on a theme, with a line under it.
export function ThemesPhone({ alt, caption, photo }: { alt: string; caption: string; photo: OccasionPhoto }) {
    return (
        <figure className="m-0 justify-self-center">
            <div className="w-[min(300px,72vw)] overflow-hidden rounded-[38px] border-8 border-solid border-[#151313] bg-[#151313] shadow-[-16px_30px_40px_rgba(70,38,24,0.25)] min-[761px]:w-[min(330px,26vw)]">
                <ProtectedImage
                    alt={alt}
                    className="block h-auto w-full"
                    height={photo.height}
                    loading="lazy"
                    sizes="(min-width: 761px) 330px, 72vw"
                    src={photo.src}
                    width={photo.width}
                />
            </div>
            <figcaption className="mt-3 mb-0 text-center text-[12px] text-[#151313]/70">{caption}</figcaption>
        </figure>
    );
}
