import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { PlatformFeatureFlagResponseDto } from "@/lib/api/types";
import { useAuth } from "@/hooks/useAuth";

export const platformFeatureFlagKeys = {
  all: ["platform-feature-flags"] as const,
};

// GET /api/platform-feature-flags — open to any authenticated principal.
// Writes require hasRole('ADMIN') and aren't exposed here.
export function usePlatformFeatureFlags() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: platformFeatureFlagKeys.all,
    queryFn: async () => {
      const res = await api.get<PlatformFeatureFlagResponseDto[]>(endpoints.platformFeatureFlags.list);
      return normalizeList(res).items;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsFeatureEnabled(featureKey: string): boolean {
  const { data } = usePlatformFeatureFlags();
  return data?.find((f) => f.featureKey === featureKey)?.isEnabled ?? false;
}
