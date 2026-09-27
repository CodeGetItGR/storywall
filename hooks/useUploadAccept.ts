import { useAppConfig } from '@/hooks/useAppConfig';
import { DEFAULT_ACCEPTED_MIME_TYPES, DEFAULT_PROFILE_PICTURE_MIME_TYPES } from '@/lib/appConfigDefaults';

// `accept` values for file inputs, from GET /api/config. Only a picker filter:
// the server checks each file's bytes.
export function useUploadAccept() {
    const { data } = useAppConfig();
    const accepted = data?.media.acceptedMimeTypes ?? DEFAULT_ACCEPTED_MIME_TYPES;
    return {
        media: accepted.join(','),
        images: accepted.filter((type) => type.startsWith('image/')).join(','),
        profilePicture: (data?.media.acceptedProfilePictureMimeTypes ?? DEFAULT_PROFILE_PICTURE_MIME_TYPES).join(','),
    };
}
