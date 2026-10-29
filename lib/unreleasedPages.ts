// The wedding QR page, the partner page for businesses and every occasion page not marked
// `launched` (lib/occasions/occasions.ts) aren't launched yet. Until then they render everywhere
// but the production site; there they 404 and drop out of the sitemap and every link. Set this to
// true to put them all live.
export const UNRELEASED_PAGES_LAUNCHED = false;

type DeploymentEnv = { VERCEL_ENV?: string; NEXT_PUBLIC_APP_ENV?: string };

// Read by name so Next.js can inline the public one at build time.
function currentEnv(): DeploymentEnv {
    return { VERCEL_ENV: process.env.VERCEL_ENV, NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV };
}

// Staging may run as its own production deployment, so its app env counts as well.
export function showsUnreleasedPages(env: DeploymentEnv = currentEnv(), launched = UNRELEASED_PAGES_LAUNCHED): boolean {
    if (launched) return true;
    return env.VERCEL_ENV !== 'production' || env.NEXT_PUBLIC_APP_ENV === 'staging';
}
