import type { CaptureLocale, WidthName } from '../../../config';
import type { CaptureState, ChangeGroup, Manifest, ReportEntry } from '../../../types';
import { groupLabels } from './labels';

// A report from before same-change grouping has no groups, and a local run has no PR.
export type ReportManifest = Omit<Manifest, 'groups'> & { groups?: ChangeGroup[]; pull?: { number: number; url: string } };

export type CaptureChoice = { locale: CaptureLocale; width: WidthName };
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

export const CAPTURE_ORDER: CaptureChoice[] = [
    { locale: 'en', width: 'mobile' },
    { locale: 'en', width: 'desktop' },
    { locale: 'el', width: 'mobile' },
    { locale: 'el', width: 'desktop' },
];

const byTree = (a: Story, b: Story) => a.area.localeCompare(b.area) || a.component.localeCompare(b.component) || a.name.localeCompare(b.name);

// The biggest change comes first, so the first capture shown is the easiest one to judge.
const biggestFirst = (a: ReportEntry, b: ReportEntry) => b.percent - a.percent || a.id.localeCompare(b.id);

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

function buildGroups({ groups = [], entries }: ReportManifest): Group[] {
    const filled = groups
        .map((group) => ({ ...group, entries: entries.filter((entry) => entry.changeKey === group.key).sort(biggestFirst) }))
        .filter((group) => group.entries.length > 1)
        .sort((a, b) => b.entries.length - a.entries.length);
    const labels = groupLabels(filled);
    return filled.map((group) => ({ ...group, label: labels.get(group.key) ?? '' }));
}

export function buildModel(manifest: ReportManifest): ReportModel {
    const storyById = buildStories(manifest.entries);
    const groups = buildGroups(manifest);
    return {
        manifest,
        stories: [...storyById.values()].sort(byTree),
        storyById,
        groups,
        groupByKey: new Map(groups.map((group) => [group.key, group])),
    };
}

export const worstState = (entries: ReportEntry[]): CaptureState =>
    STATES.find((state) => entries.some((entry) => entry.state === state)) ?? 'changed';

export const capturesInOrder = (entries: ReportEntry[]) =>
    CAPTURE_ORDER.flatMap(({ locale, width }) => entries.filter((entry) => entry.locale === locale && entry.width === width));

export const storyCapture = (story: Story, { locale, width }: CaptureChoice) =>
    story.entries.find((entry) => entry.locale === locale && entry.width === width) ?? capturesInOrder(story.entries)[0];

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
