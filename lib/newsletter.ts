// Query keys live outside hooks/useNewsletter.ts so the server profile page
// can seed the cache without importing a client-only module.
export const newsletterKeys = {
    status: ['newsletter', 'status'] as const,
};
