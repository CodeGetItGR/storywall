// Voice wishes (KAN-220). The server accepts up to 62 s; the app stops at 60 s.
export const MAX_RECORDING_MS = 60_000;

// First supported wins. WebM Opus: Chrome, Firefox, Android. MP4: Safari. Ogg: some Firefox builds.
const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'] as const;

export function pickRecordingMimeType(isTypeSupported: (type: string) => boolean): string | undefined {
    return RECORDING_MIME_TYPES.find((type) => isTypeSupported(type));
}

export function formatClipDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function recordingFileName(mimeType: string): string {
    if (mimeType.startsWith('audio/mp4')) return 'wish.m4a';
    if (mimeType.startsWith('audio/ogg')) return 'wish.ogg';
    return 'wish.webm';
}

// The server reads `wish` as a file part of JSON (a plain string field is refused) and `audio` as the recording.
// Send it as a FormData body so the browser sets the boundary and a Content-Length (the server needs one).
export function buildWishFormData(wish: object, audio: Blob | null): FormData {
    const form = new FormData();
    form.append('wish', new Blob([JSON.stringify(wish)], { type: 'application/json' }), 'wish.json');
    if (audio) form.append('audio', audio, recordingFileName(audio.type));
    return form;
}
