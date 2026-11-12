import { withoutWizardParams } from '@/lib/createEventWizardUrl';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';

// How many wizard entries lie between this one and the page the pop-up opened over. Stored on each
// history entry, so closing can go back past all of them in one step, and a reload keeps it.
const WIZARD_DEPTH_KEY = '__storywallCreateWizardDepth';

export function wizardDepth(): number {
    const state = window.history.state as Record<string, unknown> | null;
    const depth = state?.[WIZARD_DEPTH_KEY];
    return typeof depth === 'number' && depth > 0 ? depth : 0;
}

// What pushed the entry: opening the pop-up, a step change, or the compare sheet.
export type WizardEntryKind = 'open' | 'step' | 'sheet' | 'account';
const WIZARD_ENTRY_KIND_KEY = '__storywallCreateWizardEntry';

function currentEntryKind(): WizardEntryKind | null {
    const state = window.history.state as Record<string, unknown> | null;
    const kind = state?.[WIZARD_ENTRY_KIND_KEY];
    return kind === 'open' || kind === 'step' || kind === 'sheet' || kind === 'account' ? kind : null;
}

// Opening the pop-up, each step and the sheet are their own Back step.
export function pushWizardEntry(url: string, kind: WizardEntryKind = 'open'): void {
    pushPageEntry(url, { [WIZARD_DEPTH_KEY]: wizardDepth() + 1, [WIZARD_ENTRY_KIND_KEY]: kind });
}

// Leave the current step or sheet: back one entry when the wizard pushed it, else (the page was loaded
// on it) replace it with `fallbackUrl`, so Back never leaves the site.
export function leaveWizardEntry(kind: Exclude<WizardEntryKind, 'open'>, fallbackUrl: string): void {
    if (currentEntryKind() === kind) {
        window.history.back();
        return;
    }
    replaceWizardEntry(fallbackUrl);
}

// Same entry, new URL (the run id, a step the wizard skipped); the depth stays.
export function replaceWizardEntry(url: string): void {
    replacePageUrl(url);
}

// Back to the page under the pop-up. A page loaded with ?create=1 already in the URL (a shared link)
// has no wizard entry to go back to, so its params are removed instead.
export function closeWizard(): void {
    const depth = wizardDepth();
    if (depth > 0) {
        window.history.go(-depth);
        return;
    }
    replacePageUrl(withoutWizardParams(new URL(window.location.href)));
}
