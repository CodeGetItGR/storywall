import { vi } from 'vitest';

// The campaign writes as idle mutations, for tests that mock '@/hooks/useAdminCampaignApi'. A test
// overrides the ones it checks.
export function idleCampaignWrites() {
    const idle = () => ({ mutateAsync: vi.fn(), isPending: false });
    return {
        useCreateCampaign: idle,
        useUpdateCampaign: idle,
        useArchiveCampaign: idle,
        useUnarchiveCampaign: idle,
        useStopCampaignDiscount: idle,
        useDeleteCampaign: idle,
        useAddCampaignLinks: idle,
        useMoveCampaignLink: idle,
        useDeleteCampaignLink: idle,
    };
}
