import { DateCalendar } from '@/components/saveMyDate/invitation/sections/date/DateCalendar';
import { DateText } from '@/components/saveMyDate/invitation/sections/date/DateText';
import { dateDisplayModel } from '@/lib/invitation/dateDisplay';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type DateVisualProps = {
    section: Extract<InvitationSection, { type: 'date' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The date in the layout the host picked (old wedartDateVisualHtml).
export function DateVisual({ section, contrast, ctx }: DateVisualProps) {
    const { data } = section;
    const m = dateDisplayModel(data);
    const text = (path: string, value: string, className: string, tag?: 'div' | 'span') => (
        <DateText section={section} path={path} value={value} className={className} tag={tag} contrast={contrast} ctx={ctx} />
    );
    const period = (className = '') => text('periodLabel', m.periodLabel, `date-period ${className}`.trim());

    switch (data.displayStyle) {
        case 'stacked':
            return (
                <div className="date-visual date-visual-stacked">
                    {text('day', m.weekday, 'date-preset-label date-stacked-day')}
                    {text('number', m.number, 'date-preset-number date-stacked-number')}
                    {text('monthGenitive', m.monthGenitive, 'date-preset-label date-stacked-month')}
                    {text('yearLabel', m.yearLabel, 'date-preset-year date-stacked-year')}
                    <div className="date-preset-rule" />
                    {text('time', m.time, 'date-preset-time')}
                    {period()}
                </div>
            );
        case 'editorial':
            return (
                <div className="date-visual date-visual-editorial">
                    <div className="date-editorial-top">
                        <div className="date-editorial-side">
                            <i />
                            {text('day', m.weekday, 'date-preset-label date-editorial-label')}
                            <i />
                        </div>
                        {text('number', m.number, 'date-preset-number date-editorial-number')}
                        <div className="date-editorial-side">
                            <i />
                            {text('monthGenitive', m.monthGenitive, 'date-preset-label date-editorial-label')}
                            <i />
                        </div>
                    </div>
                    {text('yearLabel', m.yearLabel, 'date-preset-year date-editorial-year')}
                    {text('time', m.time, 'date-preset-time date-editorial-time')}
                    {period()}
                </div>
            );
        case 'vertical':
            return (
                <div className="date-visual date-visual-vertical">
                    {text('number', m.number, 'date-triple-number')}
                    {text('day', m.weekday, 'date-preset-label')}
                    {text('monthNumber', m.monthNumber, 'date-triple-number')}
                    {text('monthGenitive', m.monthGenitive, 'date-preset-label')}
                    {text('yearShort', m.yearShort, 'date-triple-number')}
                    <div className="date-preset-rule" />
                    {text('time', m.time, 'date-preset-time')}
                    {period()}
                </div>
            );
        case 'bullet':
            return (
                <div className="date-visual date-visual-bullet">
                    <div className="date-bullet-number">{text('number', m.number, 'date-triple-number')}</div>
                    <div className="date-bullet-label">
                        <span>•</span>
                        {text('day', m.weekday, 'date-preset-label')}
                    </div>
                    <div className="date-bullet-number">{text('monthNumber', m.monthNumber, 'date-triple-number')}</div>
                    <div className="date-bullet-label">
                        <span>•</span>
                        {text('monthGenitive', m.monthGenitive, 'date-preset-label')}
                    </div>
                    <div className="date-bullet-number">{text('yearLabel', m.yearLabel, 'date-triple-number')}</div>
                    <div className="date-preset-rule" />
                    {text('time', m.time, 'date-preset-time')}
                    {period()}
                </div>
            );
        case 'split':
            return (
                <div className="date-visual date-visual-split">
                    <div className="date-split-main">
                        {text('number', m.number, 'date-preset-number date-split-number')}
                        <div className="date-split-rule" />
                        <div className="date-split-copy">
                            {text('day', m.weekday, 'date-preset-label')}
                            {text('monthGenitive', m.monthGenitive, 'date-preset-label')}
                            {text('time', m.time, 'date-preset-time date-split-time')}
                            {text('yearLabel', m.yearLabel, 'date-preset-year')}
                        </div>
                    </div>
                </div>
            );
        case 'triple':
            return (
                <div className="date-visual date-visual-triple">
                    {text('day', m.weekday, 'date-preset-label date-triple-day')}
                    <div className="date-triple-row">
                        {text('number', m.number, 'date-triple-number')}
                        <i />
                        {text('monthNumber', m.monthNumber, 'date-triple-number')}
                        <i />
                        {text('yearShort', m.yearShort, 'date-triple-number')}
                    </div>
                    {text('monthGenitive', m.monthGenitive, 'date-preset-label date-triple-month')}
                    {text('time', m.time, 'date-preset-time')}
                    {period()}
                </div>
            );
        case 'calendar':
            return (
                <div className="date-visual date-visual-calendar">
                    <div className="date-calendar-title">
                        {text('monthName', m.monthName, 'date-calendar-month', 'span')}
                        <span className="date-calendar-title-gap"> </span>
                        {text('yearLabel', m.yearLabel, 'date-calendar-year', 'span')}
                    </div>
                    <DateCalendar model={m} label={ctx.labels.calendar} />
                    {text('time', m.time, 'date-preset-time date-calendar-time')}
                    {period('date-calendar-period')}
                </div>
            );
        case 'original':
            return (
                <div className="date-visual date-visual-original">
                    <div className="date-original-stack">
                        {text('day', m.weekday, 'date-original-day')}
                        {text('number', m.number, 'date-original-number')}
                        {text('month', data.month || `${m.monthGenitive} ${m.yearLabel}`, 'date-original-month')}
                        {text('time', m.time, 'date-original-time')}
                    </div>
                </div>
            );
    }
}
