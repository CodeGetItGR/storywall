export const MARKER = '<!-- visual-regression ';

const STATE_PATTERN = /<!-- visual-regression (\{.*?\}) -->/;
const BOX_TEXT = 'Approve these visual changes';
const BOX_PATTERN = /^- \[( |x|X)\] Approve these visual changes$/m;
const LANGUAGES = { en: 'English', el: 'Greek' };
const STATE_RANK = { changed: 0, new: 1, removed: 2 };
const MAX_PREVIEWS = 6;

const escapeMarkdown = (text) =>
    String(text)
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\\`*_{}[\]()<>#|!~]/g, '\\$&');

const renderState = (state) => `${MARKER}${JSON.stringify(state)} -->`;

export function parseState(body) {
    const match = STATE_PATTERN.exec(body ?? '');
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

export const setState = (body, state) => body.replace(STATE_PATTERN, () => renderState(state));

export const hasBox = (body) => BOX_PATTERN.test(body);

export const isTicked = (body) => {
    const match = BOX_PATTERN.exec(body);
    return Boolean(match) && match[1] !== ' ';
};

export const setBox = (body, ticked) => body.replace(BOX_PATTERN, `- [${ticked ? 'x' : ' '}] ${BOX_TEXT}`);

// GitHub can store an edited comment with Windows line endings.
export const normalizeBody = (body) => body.replaceAll('\r\n', '\n');

// The box is the only part of the comment a person may change.
export const onlyBoxChanged = (before, after) => normalizeBody(setBox(before, false)) === normalizeBody(setBox(after, false));

export function selectPreviews(entries) {
    const sorted = entries
        .filter((entry) => entry.images?.preview && entry.state in STATE_RANK)
        .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.percent - a.percent || a.id.localeCompare(b.id));
    const seen = new Set();
    const picked = [];
    for (const entry of sorted) {
        if (seen.has(entry.storyId)) continue;
        seen.add(entry.storyId);
        picked.push(entry);
        if (picked.length === MAX_PREVIEWS) break;
    }
    return picked;
}

const previewAlt = (entry) => escapeMarkdown(`${entry.title}, ${entry.name}, ${LANGUAGES[entry.locale]}, ${entry.width}, before and after`);

export function renderComment({ manifest, state, deploying = false }) {
    const { changed, removed, failed } = manifest.counts;
    const lines = [renderState(state), '### Visual check', ''];

    if (manifest.entries.length === 0) {
        lines.push('No visual changes.');
    } else {
        lines.push(
            `${changed} changed, ${manifest.counts.new} new, ${removed} removed, ${failed} failed, of ${manifest.totalCaptures.toLocaleString('en-US')} captures.`,
        );
        lines.push('', `[Open the full report](${state.reportUrl})`);
        if (deploying) lines.push('', 'Images may take a moment to appear.');
        const previews = selectPreviews(manifest.entries);
        if (previews.length > 0) lines.push('', ...previews.map((entry) => `![${previewAlt(entry)}](${state.reportUrl}${entry.images.preview})`));
        if (failed > 0) {
            lines.push('', 'Fix the stories that failed before these changes can be approved.');
        } else {
            lines.push('', `- [${state.approvedBy ? 'x' : ' '}] ${BOX_TEXT}`);
            if (state.approvedBy) lines.push('', `Approved by ${escapeMarkdown(state.approvedBy)}.`);
        }
    }

    if (manifest.missingStories.length > 0) {
        lines.push('', '**Components with no story**', ...manifest.missingStories.map((file) => `- \`${String(file).replaceAll('`', '')}\``));
    }
    return lines.join('\n');
}
