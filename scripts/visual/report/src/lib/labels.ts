import type { ReportEntry } from '../../../types';
import { copy } from '../copy';

type Capture = Pick<ReportEntry, 'locale' | 'width'>;
type LabelledGroup = { key: string; kind: 'color' | 'exact'; entries: ReportEntry[] };

export const percentText = (percent: number) => (percent < 0.01 ? '<0.01%' : `${percent.toFixed(2)}%`);

export const captureLabel = ({ locale, width }: Capture) => `${locale.toUpperCase()} ${copy.widths[width]}`;

export const entryValue = ({ state, percent }: Pick<ReportEntry, 'state' | 'percent'>) =>
    state === 'changed' ? percentText(percent) : copy.states[state];

export const componentOf = (title: string) => title.split('/').pop() ?? title;

export const shortName = ({ title, name }: Pick<ReportEntry, 'title' | 'name'>) => `${componentOf(title)} / ${name}`;

export const altText = (entry: Pick<ReportEntry, 'title' | 'name' | 'locale' | 'width'>, what: string) =>
    `${entry.title}, ${entry.name}, ${copy.languages[entry.locale]}, ${entry.width}, ${what}`;

function exactName(entries: ReportEntry[], where?: string): string {
    const names = [...new Set(entries.map((entry) => entry.name))];
    return copy.sameChangeName(componentOf(entries[0].title), names, where);
}

// Two groups can cover the same stories in different languages or widths, so those say which is which.
export function groupLabels(groups: LabelledGroup[]): Map<string, string> {
    const plain = groups.map((group) => (group.kind === 'color' ? copy.colorChange : exactName(group.entries)));
    return new Map(
        groups.map((group, index): [string, string] => {
            const repeated = plain.filter((label) => label === plain[index]).length > 1;
            if (group.kind === 'color' || !repeated) return [group.key, plain[index]];
            const where = [...new Set(group.entries.map(captureLabel))].join(', ');
            return [group.key, exactName(group.entries, where)];
        }),
    );
}
