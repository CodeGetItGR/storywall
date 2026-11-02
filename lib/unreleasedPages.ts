// The wedding QR page and the partner and vendor pages for businesses. While this is false they render
// everywhere but the production site; there they 404 and drop out of the sitemap and every link.
export const UNRELEASED_PAGES_LAUNCHED = true;

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

// Occasion pages not marked `launched` (lib/occasions/occasions.ts) launch one by one, apart from the pages above.
export function showsUnlaunchedOccasions(env: DeploymentEnv = currentEnv()): boolean {
    return showsUnreleasedPages(env, false);
}
