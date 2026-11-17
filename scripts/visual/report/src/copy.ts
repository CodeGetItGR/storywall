import type { CaptureLocale, WidthName } from '../../config';
import type { CaptureState } from '../../types';

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

const firstNames = (names: string[]) => `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}`;

// Every string on the page. The page is for developers, so it's in English only, like the PR comment.
export const copy = {
    title: 'Visual check',
    loading: 'Loading...',
    loadFailed: 'Could not load this report. It may have been deleted when the PR closed.',
    nothingMatches: 'Nothing matches these filters.',

    states: { failed: 'Failed', changed: 'Changed', new: 'New', removed: 'Removed' } satisfies Record<CaptureState, string>,
    languages: { en: 'English', el: 'Greek' } satisfies Record<CaptureLocale, string>,
    widths: { mobile: 'Mobile', desktop: 'Desktop' } satisfies Record<WidthName, string>,

    // Sidebar
    pull: (number: number) => `PR #${number}`,
    position: (at: number, total: number) => `${at} of ${total}`,
    capturesReviewed: (total: number) => (total === 1 ? 'capture reviewed' : 'captures reviewed'),
    findStory: 'Find a story',
    filterByState: 'Filter by state',
    organizeList: 'Organize the list',
    byArea: 'By area',
    sameChange: 'Same change',
    hideReviewed: 'Hide reviewed',
    overview: 'Overview',
    onTheirOwn: 'On their own',
    stories: 'Stories',
    reviewed: 'Reviewed',

    // Story
    noChange: 'no change',
    compare: 'Compare',
    sideBySide: 'Side by side',
    slider: 'Slider',
    diff: 'Diff',
    before: 'Before',
    after: 'After',
    zoom: 'Zoom',
    fit: 'Fit',
    fullSize: '100%',
    languageAndWidth: 'Language and width',
    moveDivider: 'Move the divider between before and after',

    // Failed story
    storyFailed: 'This story failed',
    noErrorMessage: 'No error message.',
    fixBeforeApproval: 'Fix it before these changes can be approved.',

    // Group
    colorChange: 'Color change',
    sameChangeName: (component: string, names: string[], where?: string) => `${component}${where ? `, ${where}` : ''}: ${firstNames(names)}`,
    sameChangeStories: (names: string[], where?: string) => `${where ? `${where}: ` : ''}${firstNames(names)}`,
    captures: (value: number) => count(value, 'capture', 'captures'),
    groupSize: (captures: number, stories: number) => `${count(captures, 'capture', 'captures')}, ${count(stories, 'story', 'stories')}`,
    showing: (story: string, capture: string) => `Showing ${story}, ${capture}`,
    everyCapture: 'Every capture with this change',
    showAll: (value: number) => `Show all ${value}`,

    // Overview
    differ: (differing: number, total: number) => `${differing} of ${total} captures ${differing === 1 ? 'differs' : 'differ'}`,
    area: 'Area',
    biggestChanges: 'Biggest changes',
    missingStories: 'Components with no story',

    // Bottom bar
    previous: '← Previous',
    next: 'Next →',
    toReview: (value: number) => `${value} to review`,
    startReview: 'Start review',
    continueReview: 'Continue review',
    looksRight: 'Looks right',
    looksRightForAll: (value: number) => `Looks right for all ${value}`,
    undoReviewed: 'Undo reviewed',
    approve: 'Approve in the PR',
    fixFailedFirst: 'Fix the failed stories first',

    // Shortcuts
    shortcuts: 'Keyboard shortcuts',
    previousOrNext: 'Previous or next',
    looksRightThenNext: 'Looks right, then next',
    nextCapture: 'Next language or width',
    compareKeys: 'Side by side, slider, diff',
    zoomKeys: 'Fit or 100%',
    modeKeys: 'By area or same change',
    close: 'Close',
};
