import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeList } from "@/lib/api/pagination";
import type { MediaResponseDto, MediaTypeConvention } from "@/lib/api/types";

export const mediaKeys = {
  list: (eventId: string) => ["events", eventId, "media"] as const,
  detail: (id: string) => ["medias", id] as const,
};

// GET /api/events/{eventId}/media — any event member.
export function useEventMedia(eventId: string | null) {
  return useQuery({
    queryKey: mediaKeys.list(eventId ?? ""),
    queryFn: async () => {
      const res = await api.get<MediaResponseDto[]>(endpoints.events.media(eventId!));
      return normalizeList(res).items;
    },
    enabled: Boolean(eventId),
  });
}

// GET /api/medias/{id}. `mediaUrl` is a presigned R2 URL that expires
// (~15min default) — re-fetch rather than caching it long-term.
export function useMediaItem(id: string | null) {
  return useQuery({
    queryKey: mediaKeys.detail(id ?? ""),
    queryFn: () => api.get<MediaResponseDto>(endpoints.medias.byId(id!)),
    enabled: Boolean(id),
  });
}

interface UploadMediaInput {
  eventId: string;
  file: File;
  mediaType: MediaTypeConvention;
  uploaderMemberId?: string;
}

// POST /api/events/{eventId}/media (multipart/form-data) — streams straight
// through this backend to R2, no separate presigned-upload-URL step. Large
// uploads go through the app server, so plan progress/timeout UX around that.
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, file, mediaType, uploaderMemberId }: UploadMediaInput) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", mediaType);
      if (uploaderMemberId) formData.append("uploaderMemberId", uploaderMemberId);
      return api.postForm<MediaResponseDto>(endpoints.events.media(eventId), formData);
    },
    onSuccess: (media) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.list(media.eventId) });
    },
  });
}

// DELETE /api/medias/{id} — uploader or HOST. A 5004 STORAGE_UPLOAD_FAILED
// error means the R2 delete failed but the DB row may still exist.
export function useDeleteMedia(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del<void>(endpoints.medias.byId(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.list(eventId) });
    },
  });
}
