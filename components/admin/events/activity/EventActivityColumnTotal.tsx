import type { LabelProps } from 'recharts';

import { type ActivityKind, topKind } from '@/lib/adminEventActivity';

type Column = Record<ActivityKind, number> & { total: number };

// A column's total, drawn above the top of its stack. Every series carries this label, and only the
// series on top of the column draws it: a zero segment has no height, so the topmost non-zero one
// does. Recharts keeps zero-height rects when a custom shape is set (EventActivityBarShape), which
// keeps LabelList's index aligned with `columns`. Drop the custom shape and these totals shift.
// When a peak is given, its total is bold.
export function EventActivityColumnTotal({
    viewBox,
    index,
    kind,
    columns,
    peak,
    formatCount,
}: LabelProps & { index?: number; kind: ActivityKind; columns: Column[]; peak?: number; formatCount: (value: number) => string }) {
    const column = index === undefined ? undefined : columns[index];
    if (!column || topKind(column) !== kind || !viewBox || !('width' in viewBox)) return null;
    const { x = 0, y = 0, width = 0 } = viewBox;
    return (
        <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="var(--ink-muted)" fontWeight={column.total === peak ? 700 : 400}>
            {formatCount(column.total)}
        </text>
    );
}
