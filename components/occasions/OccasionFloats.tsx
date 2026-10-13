import Image from 'next/image';

import type { OccasionFloat } from '@/lib/occasions/occasionMedia';

// App pieces floating over a photo: texture only, out of the accessibility tree.
export function OccasionFloats({ floats }: { floats: OccasionFloat[] }) {
    return floats.map((float) => (
        <div aria-hidden="true" className={`occasion-float ${float.className}`} data-motion={float.motion} key={float.src}>
            <Image alt="" height={float.height} sizes="(min-width: 761px) 20vw, 40vw" src={float.src} width={float.width} />
        </div>
    ));
}
