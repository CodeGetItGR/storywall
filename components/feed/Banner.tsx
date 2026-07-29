import Image from "next/image";

export function Banner({image}:{image:string}) {
    return <div className="w-full h-full px-3">
        <Image src={image} alt="Banner" className="w-full h-full object-cover rounded-xl" width={150} height={150}/>
    </div>
}