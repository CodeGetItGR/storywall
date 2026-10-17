import type { Decorator } from '@storybook/nextjs-vite';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { fn } from 'storybook/test';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { eventKeys } from '@/hooks/useEvent';
import type { AppConfigResponseDto, EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import type { ContentAccessMode } from '@/lib/contentPermissions';
import { AccountPanelProvider } from '@/providers/AccountPanelProvider';
import { AuthContext, type AuthContextValue, type AuthUser } from '@/providers/AuthProvider';
import { ComposerContext, type ComposerContextValue } from '@/providers/composer/ComposerContext';
import { EventContext, type EventContextValue } from '@/providers/EventProvider';
import { MobileChromeProvider } from '@/providers/MobileChromeProvider';
import { type PublishJob, PublishQueueContext, type PublishQueueContextValue } from '@/providers/publishQueue/PublishQueueContext';

import { storyAppConfig, storyEvent, storyMember, storyUser } from './fixtures';

// What a story's component sees from the app's providers. Set it per story or
// per file with `parameters: { app: { ... } }`; anything left out uses the
// defaults below (a signed-in guest of an active wedding).
export type StoryAppContext = {
    // null renders signed out.
    user?: AuthUser | null;
    isBootstrapping?: boolean;
    isSessionUnavailable?: boolean;
    // null renders outside any event.
    event?: EventDetailResponseDto | null;
    // The viewer's membership in `event`. A HOST member makes the viewer a host.
    member?: EventMemberResponseDto | null;
    eventLoading?: boolean;
    contentAccessMode?: ContentAccessMode;
    composer?: Partial<ComposerContextValue>;
    publishJobs?: PublishJob[];
    appConfig?: AppConfigResponseDto;
};

declare module 'storybook/internal/csf' {
    interface Parameters {
        app?: StoryAppContext;
    }
}

function authValue(app: StoryAppContext): AuthContextValue {
    const user = app.user === undefined ? storyUser : app.user;
    return {
        user,
        isAuthenticated: Boolean(user),
        isBootstrapping: app.isBootstrapping ?? false,
        isSessionUnavailable: app.isSessionUnavailable ?? false,
        register: fn(),
        login: fn(),
        oauth: fn(),
        logout: fn(),
        updateProfile: fn(),
    };
}

function eventValue(app: StoryAppContext): EventContextValue {
    const activeEvent = app.event === undefined ? storyEvent() : app.event;
    const activeMember = app.member === undefined ? storyMember() : app.member;
    return {
        memberships: activeMember ? [activeMember] : [],
        routeEventId: activeEvent?.id ?? null,
        activeEvent,
        activeMember,
        isHost: activeMember?.role === 'HOST',
        isLoading: app.eventLoading ?? false,
        contentAccessMode: app.contentAccessMode ?? 'standard',
    };
}

function composerValue(app: StoryAppContext): ComposerContextValue {
    return {
        openPostComposer: fn().mockName('openPostComposer'),
        openPostImagePicker: fn().mockName('openPostImagePicker'),
        openSongComposer: fn().mockName('openSongComposer'),
        openStoryCapture: fn().mockName('openStoryCapture'),
        canCompose: true,
        canComposePost: true,
        canComposeStory: true,
        canComposeSong: true,
        ...app.composer,
    };
}

function publishQueueValue(app: StoryAppContext): PublishQueueContextValue {
    return {
        jobs: app.publishJobs ?? [],
        enqueuePost: fn(),
        enqueueStory: fn(),
        enqueueSong: fn(),
        retryJob: fn().mockName('retryJob'),
        dismissJob: fn().mockName('dismissJob'),
    };
}

// The event and app config are already in the cache when a page renders in the
// app (EventProvider and the server prefetch put them there), so they are seeded
// here instead of fetched. Per-story server data goes through MSW.
function SeededCache({ app, event, children }: { app: StoryAppContext; event: EventDetailResponseDto | null; children: ReactNode }) {
    const queryClient = useQueryClient();
    useState(() => {
        queryClient.setQueryData(appConfigKeys.all, app.appConfig ?? storyAppConfig);
        if (event) queryClient.setQueryData(eventKeys.detail(event.id), event);
        return true;
    });
    return children;
}

function StoryAppProviders({ app, children }: { app: StoryAppContext; children: ReactNode }) {
    const [values] = useState(() => ({
        auth: authValue(app),
        event: eventValue(app),
        composer: composerValue(app),
        publishQueue: publishQueueValue(app),
    }));

    return (
        <SeededCache app={app} event={values.event.activeEvent}>
            <AuthContext.Provider value={values.auth}>
                <EventContext.Provider value={values.event}>
                    <ComposerContext.Provider value={values.composer}>
                        <PublishQueueContext.Provider value={values.publishQueue}>
                            <MobileChromeProvider>
                                <AccountPanelProvider>{children}</AccountPanelProvider>
                            </MobileChromeProvider>
                        </PublishQueueContext.Provider>
                    </ComposerContext.Provider>
                </EventContext.Provider>
            </AuthContext.Provider>
        </SeededCache>
    );
}

// Add to a story file's `decorators` when its component reads useAuth, the
// active event, the composer, the publish queue or the mobile chrome.
export const withAppContext: Decorator = (Story, context) => (
    <StoryAppProviders app={context.parameters.app ?? {}}>
        <Story />
    </StoryAppProviders>
);
