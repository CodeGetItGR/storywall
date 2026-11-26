import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

// The incident switch stays off in tests, so purchase and upload flows keep their coverage.
// lib/incident.test.ts unmocks it to test the switch itself.
vi.mock('@/lib/incident', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/incident')>()),
    INCIDENT_MODE: false,
    isPausedRequest: () => false,
}));

// jsdom has no modal dialogs: open and close them as a browser would, close event included.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
        this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
        if (!this.open) return;
        this.open = false;
        this.dispatchEvent(new Event('close'));
    };
}
