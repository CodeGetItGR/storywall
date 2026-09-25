import { useEvent } from '@/hooks/useEvent';
import type { ModuleKeyConvention } from '@/lib/api/types';
import { readableModuleKeys } from '@/lib/eventLifecycle';

// Module UI and its queries follow isAvailable (a DRAFT event's modules can be
// isEnabled but not yet available), so list hooks only run while this is true
// and never fire a read the backend answers with 409 / 5012. Reads the same
// cached event detail as EventProvider, so it adds no request.
// See plan-owned-modules-fe-integration.md §2.
export function useModuleReadable(eventId: string | null, moduleKey: ModuleKeyConvention): boolean {
    const { data: event } = useEvent(eventId);
    return readableModuleKeys(event).has(moduleKey);
}
