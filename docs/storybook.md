# Storybook

- `npm run storybook` starts Storybook on http://localhost:6006.
- `npm run build-storybook` builds it into `storybook-static/`.

## Writing stories

- Put the story next to its component: `components/<domain>/Foo.tsx` → `components/<domain>/Foo.stories.tsx`.
- Title stories by area: `UI/…`, `Common/…`, then the domain folder name (`Feed/…`, `Manage/…`, `Admin/…`).
- One story per meaningful state: default, empty, loading, error, long content, disabled. Don't add stories that only change a prop nobody sees.
- Use `fn()` from `storybook/test` for callback props, so they show in the Actions panel.
- Stateful demos go in a small named component in the story file (the `react/jsx-no-bind` rule bans inline arrows in JSX).

## What every story gets

`.storybook/preview.tsx` wraps every story in:

- the app's `globals.css` and fonts,
- `NextIntlClientProvider` with the full catalog. Switch language from the toolbar. The time zone is fixed to Europe/Athens.
- a fixed clock: `new Date()` and `Date.now()` return 2026-06-15 12:00 UTC, so countdowns and "2h ago" don't drift. Write fixture dates relative to it.
- a fresh React Query client with retries off,
- the Next.js App Router mocks (`next/navigation`, `next/link`, `next/image`). Set the route with `parameters: { nextjs: { navigation: { pathname, query } } }`.
- an MSW fallback that answers any unmocked `/api/*` call with a 404, so a missing handler shows as an empty or error state instead of a hanging request.

The visual check captures every story at mobile (375px) and desktop (1280px), in English and Greek. Three tags change that. They must be plain arrays on the story or on `meta`, because Storybook reads them without running the file:

- `tags: ['visual-skip']`: not captured. Use it for stories that look the same as another story at rest, or that can't be made stable.
- `tags: ['visual-desktop-only']`: captured at 1280px only.
- `tags: ['visual-mobile-only']`: captured at 375px only.

For a component that only shows at one size (the desktop rail, the mobile tab bar), also set `globals: { viewport: { value: 'desktop' } }` (or `'mobile'`) so the Storybook canvas opens at that size.

## App context

Components that read `useAuth`, the active event, the composer, the publish queue or the mobile chrome need the app's providers. Add `withAppContext` from `.storybook/appContext.tsx` to the file's `decorators` and describe the situation with `parameters.app`:

```tsx
import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyHostMember } from '@/.storybook/fixtures';

const meta = {
    component: MobileTabBar,
    decorators: [withAppContext],
} satisfies Meta<typeof MobileTabBar>;

export const Host: Story = {
    parameters: { app: { member: storyHostMember, event: storyEvent({ status: 'DRAFT' }) } },
};
```

With nothing set, the story is a signed-in guest of an active wedding. `user: null` renders signed out, `event: null` renders outside any event, a `HOST` member makes the viewer a host, and `composer`, `publishJobs`, `eventLoading` and `isSessionUnavailable` cover the rest. The event and the app config are put in the React Query cache too, the way the app has them before a page renders.

## Fixtures

`.storybook/fixtures.ts` builds the data stories share: `storyUser`, `storyMember()`, `storyHostMember`, `storyAuthor()`, `storyEvent()`, `storySession()`, `storyModules()`, `storyPost()`, `storyComment()`, `storyMedia()`, `storyPhotos`, `storyStory()`, `storyQrLink()`, `storyAppConfig` and `storyPage()` for paginated responses. Each takes overrides. Prefer them over new literals so every story shows the same event. Images come from `public/images`.

Handlers more than one file needs live in `.storybook/handlers.ts` (for example `hostPanelHandlers()` for the host's side panel).

## Finding text in play functions

The toolbar can switch the story to Greek, so don't match English text. Read the label from the catalog in use with `copyFor(globals)` from `.storybook/copy.ts`:

```tsx
play: async ({ canvasElement, globals }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: copyFor(globals).PostCard.moreOptions }));
},
```

Menus and modals render in a portal: look for their contents in `within(document.body)`.

## Mocking Spring data

Components that fetch through `lib/api` read from MSW in stories. Add handlers in the story's (or the file's) `beforeEach`. Start paths with `*/api/` so they match whatever the API base URL is:

```tsx
import { delay, http, HttpResponse } from 'msw';

export const Loaded: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/events/:eventId/stories', () => HttpResponse.json(stories)));
    },
};

// Loading: a response that never arrives.
export const Loading: Story = {
    beforeEach({ msw }) {
        msw.use(
            http.get('*/api/events/:eventId/stories', async () => {
                await delay('infinite');
                return HttpResponse.json([]);
            }),
        );
    },
};

// Error: the shape Spring sends.
export const Failed: Story = {
    beforeEach({ msw }) {
        msw.use(http.get('*/api/posts/:postId', () => HttpResponse.json({ status: 500, errorCode: 'INTERNAL_ERROR' }, { status: 500 })));
    },
};
```

A handler in a story's `beforeEach` takes precedence over one in the file's.
