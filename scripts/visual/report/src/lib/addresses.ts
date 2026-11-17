import type { ReportModel } from './model';
import { type Item, OVERVIEW } from './reviewOrder';

const GROUP_PREFIX = 'group-';

export function hashOf(item: Item): string {
    // Encoded, so the address reads back as the same id.
    if (item.kind === 'story') return encodeURIComponent(item.id);
    if (item.kind === 'group') return `${GROUP_PREFIX}${item.key}`;
    return 'overview';
}

function decoded(hash: string): string {
    const name = hash.replace(/^#/, '');
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
}

// An address that matches nothing opens the Overview.
export function itemFromHash(hash: string, model: ReportModel): Item {
    const name = decoded(hash);
    if (model.storyById.has(name)) return { kind: 'story', id: name };
    const key = name.startsWith(GROUP_PREFIX) ? name.slice(GROUP_PREFIX.length) : '';
    if (model.groupByKey.has(key)) return { kind: 'group', key };
    return OVERVIEW;
}

export function goToItem(item: Item) {
    window.location.hash = hashOf(item);
}
