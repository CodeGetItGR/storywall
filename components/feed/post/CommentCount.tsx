import {MessageCircle} from "lucide-react";
import React from "react";
import {cn} from "@/lib/utils";

export function CommentCount({ count, wrapperClassName, iconClassName }: { count: number; wrapperClassName?: string; iconClassName?: string }) {
    return <div className={cn(wrapperClassName, "flex items-center gap-2")}>
        <MessageCircle className={cn(iconClassName, "w-4 h-4")} strokeWidth={1.8} />
        <p className={'tabular-nums'}>{count}</p>
    </div>
}