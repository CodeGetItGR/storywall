import type { MouseEvent } from 'react';

import { ContextMenuTab } from './ContextMenuTab';
import { ContextTabLink } from './ContextTabLink';
import type { ContextNavItem } from './types';
import { isPathActive } from './utils';

interface ContextNavSlotProps {
    active: boolean;
    items: ContextNavItem[];
    menuLabel: string;
    pathname: string;
    searchParams: string;
    onItemClick: (event: MouseEvent<HTMLElement>) => void;
}

export function ContextNavSlot({ active, items, menuLabel, pathname, searchParams, onItemClick }: ContextNavSlotProps) {
    if (items.length === 0) return null;

    if (items.length === 1) {
        const [item] = items;
        return <ContextTabLink item={item} active={isPathActive(pathname, item.href, searchParams)} label={item.label} />;
    }

    return (
        <ContextMenuTab active={active} items={items} label={menuLabel} pathname={pathname} searchParams={searchParams} onItemClick={onItemClick} />
    );
}
