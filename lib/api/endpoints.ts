// Single source of truth for every backend path. All multi-word segments are
// kebab-case — the integration guide documents camelCase but the backend has
// since flipped every route; reconcile against Swagger (/v3/api-docs) if a
// path here 404s.

export const endpoints = {
  auth: {
    register: "/api/auth/register",
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
    logout: "/api/auth/logout",
    guestLogin: "/api/auth/guest-login",
  },

  me: {
    events: "/api/me/events",
  },

  notifications: {
    list: "/api/notifications",
    byId: (id: string) => `/api/notifications/${id}`,
  },

  sessions: {
    list: "/api/sessions",
    byId: (id: string) => `/api/sessions/${id}`,
  },

  users: {
    list: "/api/users",
    byId: (id: string) => `/api/users/${id}`,
  },

  events: {
    list: "/api/events",
    byId: (id: string) => `/api/events/${id}`,
    hosts: (eventId: string) => `/api/events/${eventId}/hosts`,
    hostById: (eventId: string, id: string) => `/api/events/${eventId}/hosts/${id}`,
    invitations: (eventId: string) => `/api/events/${eventId}/invitations`,
    members: (eventId: string) => `/api/events/${eventId}/members`,
    modules: (eventId: string) => `/api/events/${eventId}/modules`,
    sessions: (eventId: string) => `/api/events/${eventId}/sessions`,
    rsvps: (eventId: string) => `/api/events/${eventId}/rsvps`,
    media: (eventId: string) => `/api/events/${eventId}/media`,
    mediaBatch: (eventId: string) => `/api/events/${eventId}/media/batch`,
    posts: (eventId: string) => `/api/events/${eventId}/posts`,
    stories: (eventId: string) => `/api/events/${eventId}/stories`,
    playlistSuggestions: (eventId: string) => `/api/events/${eventId}/playlist-suggestions`,
  },

  eventHosts: {
    create: "/api/event-hosts",
    byId: (id: string) => `/api/event-hosts/${id}`,
  },

  eventInvitations: {
    create: "/api/event-invitations",
    byId: (id: string) => `/api/event-invitations/${id}`,
    accept: (inviteToken: string) => `/api/event-invitations/${inviteToken}/accept`,
    preview: (inviteToken: string) => `/api/event-invitations/${inviteToken}/preview`,
  },

  eventMembers: {
    create: "/api/event-members",
    byId: (id: string) => `/api/event-members/${id}`,
    claim: (id: string) => `/api/event-members/${id}/claim`,
  },

  eventModules: {
    create: "/api/event-modules",
    byId: (id: string) => `/api/event-modules/${id}`,
  },

  eventSessions: {
    create: "/api/event-sessions",
    byId: (id: string) => `/api/event-sessions/${id}`,
  },

  rsvps: {
    create: "/api/rsvps",
    byId: (id: string) => `/api/rsvps/${id}`,
    sessionResponses: (rsvpId: string) => `/api/rsvps/${rsvpId}/session-responses`,
  },

  rsvpSessionResponses: {
    create: "/api/rsvp-session-responses",
    byId: (id: string) => `/api/rsvp-session-responses/${id}`,
  },

  medias: {
    byId: (id: string) => `/api/medias/${id}`,
  },

  posts: {
    byId: (id: string) => `/api/posts/${id}`,
    create: "/api/posts",
    comments: (postId: string) => `/api/posts/${postId}/comments`,
    reactions: (postId: string) => `/api/posts/${postId}/reactions`,
    media: (postId: string) => `/api/posts/${postId}/media`,
  },

  comments: {
    create: "/api/comments",
    byId: (id: string) => `/api/comments/${id}`,
  },

  reactions: {
    create: "/api/reactions",
    byId: (id: string) => `/api/reactions/${id}`,
  },

  stories: {
    create: "/api/stories",
    byId: (id: string) => `/api/stories/${id}`,
  },

  playlistSuggestions: {
    create: "/api/playlist-suggestions",
    byId: (id: string) => `/api/playlist-suggestions/${id}`,
    votes: (suggestionId: string) => `/api/playlist-suggestions/${suggestionId}/votes`,
  },

  playlistVotes: {
    create: "/api/playlist-votes",
    byId: (id: string) => `/api/playlist-votes/${id}`,
  },

  postMedias: {
    create: "/api/post-medias",
  },

  auditLogs: {
    list: "/api/audit-logs",
    byId: (id: string) => `/api/audit-logs/${id}`,
  },

  moderationActions: {
    list: "/api/moderation-actions",
    byId: (id: string) => `/api/moderation-actions/${id}`,
  },

  reports: {
    list: "/api/reports",
    create: "/api/reports",
    byId: (id: string) => `/api/reports/${id}`,
  },

  telemetryEvents: {
    list: "/api/telemetry-events",
    byId: (id: string) => `/api/telemetry-events/${id}`,
  },

  platformFeatureFlags: {
    list: "/api/platform-feature-flags",
    byId: (id: string) => `/api/platform-feature-flags/${id}`,
  },
} as const;
