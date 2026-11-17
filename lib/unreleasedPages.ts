// The wedding QR page and the partner and vendor pages for businesses. While this is false they render
// everywhere but the production site; there they 404 and drop out of the sitemap and every link.
export const UNRELEASED_PAGES_LAUNCHED = true;

type DeploymentEnv = { VERCEL_ENV?: string; NEXT_PUBLIC_APP_ENV?: string };

// Read by name so Next.js can inline the public ones at build time. Browser code has no VERCEL_ENV,
// so it reads the copy next.config.mjs inlines.
function currentEnv(): DeploymentEnv {
    return {
        VERCEL_ENV: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV,
        NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    };
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

// The pop-up create wizard (KAN-197). While this is false the production site keeps the old create
// flow: sign-in first, /events/new protected, no header, rail, phone or home create buttons.
export const CREATE_WIZARD_LAUNCHED = true;

// Server only: VERCEL_ENV never reaches the browser. Client code reads useCreateWizardEnabled().
export function showsCreateWizard(env: DeploymentEnv = currentEnv(), launched = CREATE_WIZARD_LAUNCHED): boolean {
    return showsUnreleasedPages(env, launched);
}
