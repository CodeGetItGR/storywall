'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CaptureMode = 'photo' | 'video';

interface StoryCameraController {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    mode: CaptureMode;
    isReady: boolean;
    isRecording: boolean;
    error: 'permission' | 'unavailable' | null;
    setPhotoMode: () => void;
    setVideoMode: () => void;
    capture: () => void;
    switchCamera: () => void;
}

function supportedRecordingType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

export function useStoryCameraController(open: boolean, onCapture: (file: File) => void): StoryCameraController {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const onCaptureRef = useRef(onCapture);
    const [mode, setMode] = useState<CaptureMode>('photo');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [isReady, setIsReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<'permission' | 'unavailable' | null>(null);

    useEffect(() => {
        onCaptureRef.current = onCapture;
    }, [onCapture]);

    const stopStream = useCallback(() => {
        recorderRef.current?.stop();
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        if (!open) {
            stopStream();
            return;
        }

        let cancelled = false;
        async function startCamera() {
            stopStream();
            setIsReady(false);
            setIsRecording(false);
            setError(null);
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('unavailable');
                return;
            }
            try {
                // Request camera and microphone together so both permission prompts appear
                // at once, rather than surprising the user with a second mic prompt later
                // when they switch to video mode.
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
                    audio: true,
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setIsReady(true);
            } catch (cause) {
                const name = cause instanceof DOMException ? cause.name : '';
                setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission' : 'unavailable');
            }
        }
        void startCamera();
        return () => {
            cancelled = true;
            stopStream();
        };
    }, [facingMode, open, stopStream]);

    function capturePhoto() {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onCaptureRef.current(new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.92
        );
    }

    function toggleRecording() {
        if (isRecording) {
            recorderRef.current?.stop();
            return;
        }
        const stream = streamRef.current;
        if (!stream || typeof MediaRecorder === 'undefined') {
            setError('unavailable');
            return;
        }
        chunksRef.current = [];
        const mimeType = supportedRecordingType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
            const type = recorder.mimeType || mimeType || 'video/webm';
            const extension = type.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(chunksRef.current, { type });
            if (blob.size > 0) onCaptureRef.current(new File([blob], `story-${Date.now()}.${extension}`, { type }));
            recorderRef.current = null;
            setIsRecording(false);
        };
        recorder.start(250);
        setIsRecording(true);
    }

    return {
        videoRef,
        mode,
        isReady,
        isRecording,
        error,
        setPhotoMode: () => setMode('photo'),
        setVideoMode: () => setMode('video'),
        capture: mode === 'photo' ? capturePhoto : toggleRecording,
        switchCamera: () => setFacingMode((current) => (current === 'environment' ? 'user' : 'environment')),
    };
}
