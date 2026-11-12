import Image from 'next/image';
import { useTranslations } from 'next-intl';

// The 3D emoji shown once a guest's photos or wish are sent. Saved at 480px for a 160px slot, so it stays sharp.
const ART = {
    upload: { src: '/images/qr-upload-sent.webp', altKey: 'qrUploadSent' },
    wish: { src: '/images/qr-wish-sent.webp', altKey: 'qrWishSent' },
} as const;

export function QrSentArt({ kind }: { kind: keyof typeof ART }) {
    const tAlt = useTranslations('ImageAlt');
    const { src, altKey } = ART[kind];
    return <Image src={src} alt={tAlt(altKey)} width={160} height={160} className="size-40" />;
}
