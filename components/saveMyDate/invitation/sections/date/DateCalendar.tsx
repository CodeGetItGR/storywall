import { calendarMonth, type DateDisplayModel } from '@/lib/invitation/dateDisplay';

type DateCalendarProps = { model: DateDisplayModel; label: string };

// The event's month with its day circled.
export function DateCalendar({ model, label }: DateCalendarProps) {
    const { headings, cells } = calendarMonth(model);

    return (
        <div className="date-calendar" aria-label={label}>
            {/* Weekdays */}
            <div className="date-calendar-heading">
                {headings.map((heading) => (
                    <span key={heading}>{heading}</span>
                ))}
            </div>
            {/* Days */}
            <div className="date-calendar-grid">
                {cells.map((cell, index) => (
                    <div
                        key={index}
                        className={['date-calendar-cell', cell.adjacent && 'is-adjacent', cell.event && 'is-event'].filter(Boolean).join(' ')}
                    >
                        <span>{cell.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
