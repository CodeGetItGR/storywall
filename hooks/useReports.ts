import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ReportRequestDto, ReportResponseDto } from "@/lib/api/types";

// POST /api/reports — the one write endpoint in the admin domain open to
// normal users/guests with event access, so anyone can report a post/comment/
// member. `reporterMemberId` is accepted but ignored server-side (derived
// from the JWT) — omit it. List/detail/delete are ADMIN-only and not exposed here.
export function useCreateReport() {
  return useMutation({
    mutationFn: (input: Omit<ReportRequestDto, "reporterMemberId">) =>
      api.post<ReportResponseDto>(endpoints.reports.create, input),
  });
}
