import {cn} from "@/lib/utils";
import {useLocale} from "next-intl";

export function EventInfo({date, type, place, className}: {date: number, type: string, place: string, className?:string}) {
    const locale = useLocale()

    const formatted = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date)).toUpperCase();

    return <div className={cn(className,'flex justify-between items-center')}>
        <p className="text-[1rem] alegreya-light">{formatted}</p>

        <div className={'flex gap-2 text-[1rem] alegreya-light'}>
            <p>{type}</p>
            <p aria-hidden="true" className={cn({'hidden':!place})}> • </p>
            <p>{place}</p>
        </div>
    </div>
}