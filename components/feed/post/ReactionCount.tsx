import {Heart} from "lucide-react";
import React from "react";
import {cn} from "@/lib/utils";

export function ReactionCount({ count, wrapperClassName, iconClassName, iconStrokeWidth }: { count: number; wrapperClassName?: string; iconClassName?: string; iconStrokeWidth?: number }) {
    return <div className={cn(wrapperClassName, "flex items-center gap-2")}>
        <Heart className={cn(iconClassName, "w-4 h-4")} strokeWidth={iconStrokeWidth} />
        <p className={'tabular-nums'}>{count}</p>
    </div>
}