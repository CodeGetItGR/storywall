import { MessageCircle } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

export function CommentCount({ count, wrapperClassName, iconClassName }: { count: number; wrapperClassName?: string; iconClassName?: string }) {
    return (
        <div className={cn(wrapperClassName, 'flex items-center gap-2')}>
            <MessageCircle className={cn(iconClassName, 'h-5 w-5')} strokeWidth={1.8} />
            <p className={'tabular-nums'}>{count}</p>
        </div>
    );
}
