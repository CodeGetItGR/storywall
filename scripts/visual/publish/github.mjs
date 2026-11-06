import { MARKER } from './comment.mjs';

export const STATUS_CONTEXT = 'visual-regression';

export const BOT_LOGIN = 'github-actions[bot]';

export function createGitHub({ token, repo }) {
    async function request(path, { method = 'GET', body } = {}) {
        const response = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${token}`,
                accept: 'application/vnd.github+json',
                'x-github-api-version': '2022-11-28',
                ...(body ? { 'content-type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${await response.text()}`);
        return response.status === 204 ? null : response.json();
    }

    return {
        getPull: (number) => request(`/repos/${repo}/pulls/${number}`),

        getComment: (id) => request(`/repos/${repo}/issues/comments/${id}`),

        // Newest first, including older statuses for the same context.
        listStatuses: (sha) => request(`/repos/${repo}/commits/${sha}/statuses?per_page=100`),

        async findComment(number) {
            for (let page = 1; ; page += 1) {
                const comments = await request(`/repos/${repo}/issues/${number}/comments?per_page=100&page=${page}`);
                const match = comments.find((comment) => comment.user?.login === BOT_LOGIN && comment.body?.includes(MARKER));
                if (match) return match;
                if (comments.length < 100) return null;
            }
        },

        createComment: (number, body) => request(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: { body } }),

        updateComment: (id, body) => request(`/repos/${repo}/issues/comments/${id}`, { method: 'PATCH', body: { body } }),

        setStatus: (sha, { state, description }, targetUrl) =>
            request(`/repos/${repo}/statuses/${sha}`, {
                method: 'POST',
                body: { state, context: STATUS_CONTEXT, description: description.slice(0, 140), target_url: targetUrl },
            }),
    };
}
