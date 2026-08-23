import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventModules } from '@/hooks/useEventModules';
import { usePlaylistSuggestions } from '@/hooks/usePlaylist';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findPlansUnlockingModule } from '@/lib/planTiers';
import { sortPlaylistSuggestionsBySupport } from '@/lib/playlistRanking';
import { useComposer } from '@/providers/ComposerProvider';

export function usePlaylistPageData({ activeEvent, eventId }: { activeEvent: EventDetailResponseDto; eventId: string }) {
    const { openSongComposer, canComposeSong } = useComposer();
    const { data: appConfig } = useAppConfig();
    const { data: modules = [], isLoading: isLoadingModules } = useEventModules(eventId);
    const { data: suggestionsData, isLoading: suggestionsLoading } = usePlaylistSuggestions(eventId);
    const suggestions = sortPlaylistSuggestionsBySupport(suggestionsData ?? []);
    const playlistEnabled = modules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const playlistInRegistry = appConfig?.modules.some((module) => module.moduleKey === 'playlist' && module.isEnabled) ?? true;
    const unlockingPlans = playlistInRegistry ? findPlansUnlockingModule(appConfig?.planTiers ?? [], 'playlist') : [];
    const unlockPlanNames = unlockingPlans.map((plan) => plan.name).join(', ');

    return {
        canSuggest: canComposeSong && isEventWritable(activeEvent.status),
        isLoadingModules,
        onSuggest: openSongComposer,
        playlistEnabled,
        playlistInRegistry,
        suggestions,
        suggestionsLoading,
        unlockPlanNames,
    };
}
