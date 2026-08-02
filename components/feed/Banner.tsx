import Image from 'next/image';

function BannerOverlay({ title }: { title: string }) {
    return (
        <div className={'absolute top-0 left-0 w-full h-full rounded-xl '}>
            <div className={'absolute bottom-1 left-2 p-4'}>
                <h1 className="text-2xl alegreya-light text-[#F2D274]">{title}</h1>
            </div>
            <div className={'absolute bottom-0 w-full bg-white/80 h-1/6 blur-xl rounded-t-xl'} />
        </div>
    );
}

export function Banner({ image, title }: { image: string; title: string }) {
    return (
        <div className="relative w-full h-full px-3">
            <Image src={image} alt="Banner" className="w-full h-full object-cover rounded-lg" width={150} height={150} />
            <BannerOverlay title={title} />
        </div>
    );
}
