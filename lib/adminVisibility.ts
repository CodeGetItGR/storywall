// Shared "no bare switches for multi-boolean state" pattern (AGENTS.md): any
// admin entity governed by an isAssignable/isPublic pair collapses to one of
// three visibility states instead of two independent checkboxes.
export type Visibility = 'LIVE' | 'HIDDEN' | 'ARCHIVED';
export const VISIBILITY_OPTIONS: Visibility[] = ['LIVE', 'HIDDEN', 'ARCHIVED'];

export function visibilityOf(entity: { isAssignable: boolean; isPublic: boolean }): Visibility {
    if (!entity.isAssignable) return 'ARCHIVED';
    return entity.isPublic ? 'LIVE' : 'HIDDEN';
}

export function visibilityFlags(visibility: Visibility): { isPublic: boolean; isAssignable: boolean } {
    if (visibility === 'LIVE') return { isPublic: true, isAssignable: true };
    if (visibility === 'HIDDEN') return { isPublic: false, isAssignable: true };
    return { isPublic: false, isAssignable: false };
}
