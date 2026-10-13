import { endpoints } from '@/lib/api/endpoints';
import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { PartnerProgramSummaryDto } from '@/lib/api/types';

const SUMMARY_REVALIDATE_SECONDS = 300;

// Best-effort, like serverGet: a failure (Spring down, endpoint not deployed
// yet) gives null and the page shows the plain "limited" line instead.
export async function fetchPartnerProgramSummary(): Promise<PartnerProgramSummaryDto | null> {
    try {
        return await serverPublicCachedGet<PartnerProgramSummaryDto>(endpoints.partnerProgram.summary, SUMMARY_REVALIDATE_SECONDS);
    } catch {
        return null;
    }
}
