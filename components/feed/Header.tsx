import {Logo} from "@/components/common/Logo";
import {Countdown} from "./Countdown";

export function Header({countdownTime}: {countdownTime: number}) {
    return <div className={'py-5 px-4 flex gap-4 items-center justify-between'}>
        <Logo direction="row" />
        <Countdown time={countdownTime} className={'ml-2'}/>
    </div>
}