import {cn} from "@/lib/utils";

export function EventInfo({date, type, place, className}: {date: number, type: string, place: string, className?:string}) {
    return <div className={cn(className,'flex justify-between items-center')}>
        <p className="text-[1rem] alegreya-light">{date}</p>

        <div className={'flex gap-5 text-[1rem] alegreya-light'}>
            <p>{type}</p>
            <p>{place}</p>
        </div>
    </div>
}