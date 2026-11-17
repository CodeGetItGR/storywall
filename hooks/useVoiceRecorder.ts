'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { MAX_RECORDING_MS, pickRecordingMimeType } from '@/lib/wishbook/voice';

export type VoiceRecorderStatus = 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported';

export interface VoiceRecording {
    blob: Blob;
    url: string;
    durationMs: number;
}

const TICK_MS = 250;
// What a recorder that reports no type of its own most likely produced.
const FALLBACK_MIME_TYPE = 'audio/webm';

function subscribeNever() {
    return () => {};
}
function canRecord() {
    return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}
// The server never renders the control, so the first client render matches it.
function canRecordOnServer() {
    return false;
}

function releaseStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
}

// Records one spoken wish with MediaRecorder. Stops at 60 s; frees the microphone and the blob URL.
export function useVoiceRecorder() {
    const supported = useSyncExternalStore(subscribeNever, canRecord, canRecordOnServer);
    const [phase, setPhase] = useState<Exclude<VoiceRecorderStatus, 'unsupported'> | 'noMicrophone'>('idle');
    const [elapsedMs, setElapsedMs] = useState(0);
    const [recording, setRecording] = useState<VoiceRecording | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startedAtRef = useRef(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const urlRef = useRef<string | null>(null);
    const mountedRef = useRef(false);

    const releaseMicrophone = useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        releaseStream(streamRef.current);
        streamRef.current = null;
    }, []);

    const forgetRecording = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setRecording(null);
    }, []);

    const stop = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state === 'recording') recorder.stop();
    }, []);

    const start = useCallback(async () => {
        forgetRecording();
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            if (!mountedRef.current) return;
            const name = error instanceof Error ? error.name : '';
            setPhase(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'noMicrophone');
            return;
        }
        // Left the page while the permission prompt was open: give the microphone straight back.
        if (!mountedRef.current) {
            releaseStream(stream);
            return;
        }
        streamRef.current = stream;
        const mimeType = pickRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = () => {
            const durationMs = Math.min(Date.now() - startedAtRef.current, MAX_RECORDING_MS + TICK_MS * 2);
            releaseMicrophone();
            // The recorder's own type wins: iOS Safari records MP4 whatever was asked for.
            const type = recorder.mimeType || chunks[0]?.type || mimeType || FALLBACK_MIME_TYPE;
            const blob = new Blob(chunks, { type });
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setRecording({ blob, url, durationMs });
            setElapsedMs(durationMs);
            setPhase('recorded');
        };
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        recorder.start();
        setPhase('recording');
        tickRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAtRef.current;
            setElapsedMs(Math.min(elapsed, MAX_RECORDING_MS));
            if (elapsed >= MAX_RECORDING_MS) stop();
        }, TICK_MS);
    }, [forgetRecording, releaseMicrophone, stop]);

    const discard = useCallback(() => {
        forgetRecording();
        setElapsedMs(0);
        setPhase('idle');
    }, [forgetRecording]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'recording') {
                recorder.onstop = null;
                recorder.stop();
            }
            recorderRef.current = null;
            releaseMicrophone();
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        };
    }, [releaseMicrophone]);

    const status: VoiceRecorderStatus = !supported || phase === 'noMicrophone' ? 'unsupported' : phase;
    return { status, elapsedMs, recording, start, stop, discard };
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>;
