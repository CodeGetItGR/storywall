// Finds a visual-baseline run that is still capturing a PR's base, and waits for it,
// so the PR doesn't capture the same base again.

export type BaseState = 'saved' | 'pending' | 'missing';

type Run = { id: number; status: string };

const NOT_FINISHED = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

// The API lists the newest run first.
export const pendingBaselineRun = (runs: Run[]): number | null => runs.find((run) => NOT_FINISHED.has(run.status))?.id ?? null;

export const baseState = (cacheHit: boolean, pendingRun: number | null): BaseState =>
    cacheHit ? 'saved' : pendingRun !== null ? 'pending' : 'missing';

type GitHub = { repo: string; token: string };

async function api<T>({ repo, token }: GitHub, path: string): Promise<T> {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
        // A stalled call must not stretch the wait past its limit; the abort error counts as "still going".
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
    return (await response.json()) as T;
}

export async function findPendingBaselineRun(github: GitHub, sha: string): Promise<number | null> {
    const { workflow_runs: runs } = await api<{ workflow_runs: Run[] }>(
        github,
        `/actions/workflows/visual-baseline.yml/runs?head_sha=${sha}&per_page=20`,
    );
    return pendingBaselineRun(runs);
}

export const runStatus = async (github: GitHub, runId: number) => (await api<Run>(github, `/actions/runs/${runId}`)).status;

type WaitInput = {
    getStatus: () => Promise<string>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    limitMs: number;
    intervalMs: number;
};

// An API error counts as "still going": giving up early would only make the share capture the base itself.
export async function waitForRun({ getStatus, sleep, now, limitMs, intervalMs }: WaitInput): Promise<'completed' | 'timeout'> {
    if (!(Number.isFinite(limitMs) && limitMs >= 0 && Number.isFinite(intervalMs) && intervalMs > 0)) {
        throw new Error(`Expected a limit and an interval in ms, got ${limitMs} and ${intervalMs}`);
    }
    const deadline = now() + limitMs;
    for (;;) {
        try {
            if ((await getStatus()) === 'completed') return 'completed';
        } catch (error) {
            process.stdout.write(`Could not read the baseline run: ${error instanceof Error ? error.message : String(error)}\n`);
        }
        const left = deadline - now();
        if (left <= 0) return 'timeout';
        await sleep(Math.min(intervalMs, left));
    }
}
