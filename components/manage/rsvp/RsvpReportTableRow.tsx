import type { RsvpReportRowDto } from '@/lib/api/types';

const EMPTY_CELL = '—';

export function RsvpReportTableRow({ row }: { row: RsvpReportRowDto }) {
    return (
        <tr className="break-inside-avoid border-b border-border text-ink">
            <td className="px-2 py-1.5">{row.name}</td>
            <td className="px-2 py-1.5 whitespace-nowrap">{row.phone || EMPTY_CELL}</td>
            <td className="px-2 py-1.5 tabular-nums">{row.adults}</td>
            <td className="px-2 py-1.5 tabular-nums">{row.children}</td>
            <td className="px-2 py-1.5">{row.notes || EMPTY_CELL}</td>
        </tr>
    );
}
