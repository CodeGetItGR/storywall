import { type BarShapeProps, Rectangle } from 'recharts';

import { type ActivityKind, topKind } from '@/lib/adminEventActivity';

type Column = Record<ActivityKind, number> & { total: number };

// One segment of a stacked column. The segment on top of its column gets the 4 px rounded top, and
// when a peak is given, every column but the peak is drawn a touch quieter.
export function EventActivityBarShape({
    x,
    y,
    width,
    height,
    fill,
    payload,
    kind,
    peak,
}: Partial<BarShapeProps> & { kind: ActivityKind; peak?: number }) {
    const column = payload as Column | undefined;
    if (!column) return null;
    return (
        <Rectangle
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            fillOpacity={peak === undefined || column.total === peak ? 1 : 0.82}
            radius={topKind(column) === kind ? [4, 4, 0, 0] : 0}
        />
    );
}
