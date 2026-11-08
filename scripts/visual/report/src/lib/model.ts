import type { CaptureState, ChangeGroup, Manifest, ReportEntry } from '../../../types';
import { type CaptureChoice, capturesInOrder } from './captures';
import { groupLabels } from './labels';

// A report from before same-change grouping has no groups, and a local run has no PR.
export type ReportManifest = Omit<Manifest, 'groups'> & { groups?: ChangeGroup[]; pull?: { number: number; url: string } };

export type Story = { id: string; area: string; component: string; name: string; entries: ReportEntry[] };
export type Group = ChangeGroup & { label: string; entries: ReportEntry[] };
export type ComponentBranch = { key: string; component: string; stories: Story[] };
export type AreaBranch = { area: string; count: number; components: ComponentBranch[] };

export type ReportModel = {
    manifest: ReportManifest;
    stories: Story[];
    storyById: ReadonlyMap<string, Story>;
    groups: Group[];
    groupByKey: ReadonlyMap<string, Group>;
};

export const STATES: CaptureState[] = ['failed', 'changed', 'new', 'removed'];

// One fixed language, so the order is the same on every machine.
const collator = new Intl.Collator('en');
const byTree = (a: Story, b: Story) =>
    collator.compare(a.area, b.area) || collator.compare(a.component, b.component) || collator.compare(a.name, b.name);

// The biggest change comes first, so the first capture shown is the easiest one to judge.
const biggestFirst = (a: ReportEntry, b: ReportEntry) => b.percent - a.percent || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function buildStories(entries: ReportEntry[]): Map<string, Story> {
    const stories = new Map<string, Story>();
    for (const entry of entries) {
        const story = stories.get(entry.storyId);
        if (story) {
            story.entries.push(entry);
        } else {
            const [area, ...rest] = entry.title.split('/');
            stories.set(entry.storyId, { id: entry.storyId, area, component: rest.join(' / ') || area, name: entry.name, entries: [entry] });
        }
    }
    return stories;
}

function buildGroups({ groups = [], entries }: ReportManifest, stories: Story[]): Group[] {
    const filled = groups
        .map((group) => ({ ...group, entries: entries.filter((entry) => entry.changeKey === group.key) }))
        .filter((group) => group.entries.length > 1)
        .sort((a, b) => b.entries.length - a.entries.length);
    // Labels name stories in the order the area list shows them, so a label doesn't change with the percents.
    const position = new Map(stories.map((story, index) => [story.id, index]));
    const inStoryOrder = (a: ReportEntry, b: ReportEntry) => (position.get(a.storyId) as number) - (position.get(b.storyId) as number);
    const labels = groupLabels(filled.map((group) => ({ ...group, entries: [...group.entries].sort(inStoryOrder) })));
    return filled.map((group) => ({ ...group, entries: [...group.entries].sort(biggestFirst), label: labels.get(group.key) ?? '' }));
}

export function buildModel(loaded: ReportManifest): ReportModel {
    // A report from before same-change grouping has no changeKey on its entries.
    const manifest = { ...loaded, entries: loaded.entries.map((entry) => ({ ...entry, changeKey: entry.changeKey ?? null })) };
    const storyById = buildStories(manifest.entries);
    const stories = [...storyById.values()].sort(byTree);
    const groups = buildGroups(manifest, stories);
    return { manifest, stories, storyById, groups, groupByKey: new Map(groups.map((group) => [group.key, group])) };
}

export const worstState = (entries: ReportEntry[]): CaptureState =>
    STATES.find((state) => entries.some((entry) => entry.state === state)) ?? 'changed';

export const findCapture = (story: Story, { locale, width }: CaptureChoice) =>
    story.entries.find((entry) => entry.locale === locale && entry.width === width);

export const storyCapture = (story: Story, choice: CaptureChoice) => findCapture(story, choice) ?? capturesInOrder(story.entries)[0];

export function largestPercent(story: Story): number | null {
    const changed = story.entries.filter((entry) => entry.state === 'changed');
    return changed.length > 0 ? Math.max(...changed.map((entry) => entry.percent)) : null;
}

export function areaTree(stories: Story[]): AreaBranch[] {
    const areas = new Map<string, Map<string, Story[]>>();
    for (const story of stories) {
        const components = areas.get(story.area) ?? new Map<string, Story[]>();
        components.set(story.component, [...(components.get(story.component) ?? []), story]);
        areas.set(story.area, components);
    }
    return [...areas].map(([area, components]) => ({
        area,
        count: [...components.values()].reduce((sum, list) => sum + list.length, 0),
        components: [...components].map(([component, list]) => ({ key: `${area}/${component}`, component, stories: list })),
    }));
}
