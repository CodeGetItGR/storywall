import Image from "next/image";
import {Countdown} from "./Countdown";

export function Header({countdownTime}: {countdownTime: number}) {
    return <div className={'py-5 px-4 flex gap-4 items-center justify-between'}>
        <div className={'flex items-center gap-3'}>
            <Image src={"/assets/Logo.svg"} alt={'StoryWall'} width={50} height={50} />
            <Image src={"/assets/LogoText.svg"} alt={'StoryWall'} width={150} height={150} />
        </div>
        <Countdown time={countdownTime} className={'ml-2'}/>
    </div>
}