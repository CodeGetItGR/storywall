import type { ReportEntry } from '../../../types';
import { copy } from '../copy';
import { capturesInOrder } from './captures';

type Capture = Pick<ReportEntry, 'locale' | 'width'>;
// Entries come in story order, so the names in a label do too.
type LabelledGroup = { key: string; kind: 'color' | 'exact'; entries: ReportEntry[] };

const unique = (values: string[]) => [...new Set(values)];

export const percentText = (percent: number) => (percent < 0.01 ? '<0.01%' : `${percent.toFixed(2)}%`);

export const captureLabel = ({ locale, width }: Capture) => `${locale.toUpperCase()} ${copy.widths[width]}`;

export const entryValue = ({ state, percent }: Pick<ReportEntry, 'state' | 'percent'>) =>
    state === 'changed' ? percentText(percent) : copy.states[state];

export const componentOf = (title: string) => title.split('/').filter(Boolean).pop() ?? title;

export const shortName = ({ title, name }: Pick<ReportEntry, 'title' | 'name'>) => `${componentOf(title)} / ${name}`;

export const altText = (entry: Pick<ReportEntry, 'title' | 'name' | 'locale' | 'width'>, what: string) =>
    `${entry.title}, ${entry.name}, ${copy.languages[entry.locale]}, ${entry.width}, ${what}`;

// A group across several components names each story with its component.
function exactName(entries: ReportEntry[], where?: string): string {
    const components = unique(entries.map((entry) => componentOf(entry.title)));
    if (components.length > 1) return copy.sameChangeStories(unique(entries.map(shortName)), where);
    return copy.sameChangeName(components[0], unique(entries.map((entry) => entry.name)), where);
}

// Two groups can cover the same stories in different languages or widths, so those say which is which.
export function groupLabels(groups: LabelledGroup[]): Map<string, string> {
    const plain = groups.map((group) => (group.kind === 'color' ? copy.colorChange : exactName(group.entries)));
    return new Map(
        groups.map((group, index): [string, string] => {
            const repeated = plain.filter((label) => label === plain[index]).length > 1;
            if (group.kind === 'color' || !repeated) return [group.key, plain[index]];
            const where = unique(capturesInOrder(group.entries).map(captureLabel)).join(', ');
            return [group.key, exactName(group.entries, where)];
        }),
    );
}
