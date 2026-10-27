import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

// The incident switch stays off in tests, so purchase and upload flows keep their coverage.
// lib/incident.test.ts unmocks it to test the switch itself.
vi.mock('@/lib/incident', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/incident')>()),
    INCIDENT_MODE: false,
    isPausedRequest: () => false,
}));
