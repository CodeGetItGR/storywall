'use client';

import { type TouchEvent as ReactTouchEvent, useCallback, useEffect, useRef, useState } from 'react';

type CaptureMode = 'photo' | 'video';

export interface ExposureState {
    min: number;
    max: number;
    step: number;
    value: number;
}

interface StoryCameraController {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    mode: CaptureMode;
    isReady: boolean;
    isRecording: boolean;
    error: 'permission' | 'unavailable' | null;
    exposure: ExposureState | null;
    setExposure: (value: number) => void;
    zoomHandlers: {
        onTouchStart: (event: ReactTouchEvent<HTMLElement>) => void;
        onTouchMove: (event: ReactTouchEvent<HTMLElement>) => void;
        onTouchEnd: (event: ReactTouchEvent<HTMLElement>) => void;
    };
    setPhotoMode: () => void;
    setVideoMode: () => void;
    capture: () => void;
    switchCamera: () => void;
}

type RangeCapability = { min?: number; max?: number; step?: number };
type CameraConstraints = MediaTrackConstraints & { resizeMode?: ConstrainDOMString };

function getRangeCapability(track: MediaStreamTrack, key: 'zoom' | 'exposureCompensation'): Required<RangeCapability> | null {
    const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & Record<string, RangeCapability | undefined>;
    const range = capabilities[key];
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number' || range.max <= range.min) return null;
    return { min: range.min, max: range.max, step: range.step && range.step > 0 ? range.step : (range.max - range.min) / 100 };
}

function touchDistance(touches: React.TouchList): number {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function supportedRecordingType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

function getViewportAspectRatio(): number {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    return height > 0 ? width / height : 9 / 16;
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
    const [exposure, setExposureState] = useState<ExposureState | null>(null);
    const [viewportAspectRatio, setViewportAspectRatio] = useState(9 / 16);
    const zoomRef = useRef<{ min: number; max: number; step: number; value: number } | null>(null);
    const pinchStartDistanceRef = useRef<number | null>(null);
    const pinchStartZoomRef = useRef<number>(1);

    useEffect(() => {
        onCaptureRef.current = onCapture;
    }, [onCapture]);

    useEffect(() => {
        if (!open) return;

        function updateViewportAspectRatio() {
            setViewportAspectRatio(getViewportAspectRatio());
        }

        updateViewportAspectRatio();
        window.addEventListener('resize', updateViewportAspectRatio);
        window.visualViewport?.addEventListener('resize', updateViewportAspectRatio);
        return () => {
            window.removeEventListener('resize', updateViewportAspectRatio);
            window.visualViewport?.removeEventListener('resize', updateViewportAspectRatio);
        };
    }, [open]);

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
            zoomRef.current = null;
            setExposureState(null);
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('unavailable');
                return;
            }
            try {
                // Request camera and microphone together so both permission prompts appear
                // at once, rather than surprising the user with a second mic prompt later
                // when they switch to video mode.
                const videoConstraints: CameraConstraints = {
                    facingMode,
                    width: { ideal: viewportAspectRatio > 1 ? 1920 : 1080 },
                    height: { ideal: viewportAspectRatio > 1 ? 1080 : 1920 },
                    aspectRatio: { ideal: viewportAspectRatio },
                    resizeMode: 'none',
                };
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: true,
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                const videoTrack = stream.getVideoTracks()[0];
                const zoomCapability = videoTrack && getRangeCapability(videoTrack, 'zoom');
                if (videoTrack && zoomCapability) {
                    zoomRef.current = { ...zoomCapability, value: zoomCapability.min };
                    try {
                        await videoTrack.applyConstraints({ advanced: [{ zoom: zoomCapability.min } as MediaTrackConstraintSet] });
                    } catch {
                        // Zoom support is optional even when a browser reports the capability.
                    }
                }
                const exposureCapability = videoTrack && getRangeCapability(videoTrack, 'exposureCompensation');
                if (videoTrack && exposureCapability) {
                    const currentValue = (videoTrack.getSettings() as MediaTrackSettings & { exposureCompensation?: number }).exposureCompensation;
                    const midpoint = (exposureCapability.min + exposureCapability.max) / 2;
                    setExposureState({ ...exposureCapability, value: currentValue ?? midpoint });
                }
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
    }, [facingMode, open, stopStream, viewportAspectRatio]);

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
            0.92,
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

    function setExposure(value: number) {
        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (!videoTrack || !exposure) return;
        const clamped = Math.min(exposure.max, Math.max(exposure.min, value));
        setExposureState({ ...exposure, value: clamped });
        videoTrack.applyConstraints({ advanced: [{ exposureCompensation: clamped } as MediaTrackConstraintSet] }).catch(() => {
            // Some browsers report the capability but refuse the constraint at runtime.
        });
    }

    function onTouchStart(event: ReactTouchEvent<HTMLElement>) {
        if (event.touches.length === 2 && zoomRef.current) {
            pinchStartDistanceRef.current = touchDistance(event.touches);
            pinchStartZoomRef.current = zoomRef.current.value;
        }
    }

    function onTouchMove(event: ReactTouchEvent<HTMLElement>) {
        const zoomState = zoomRef.current;
        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (event.touches.length !== 2 || !zoomState || !videoTrack || pinchStartDistanceRef.current === null) return;
        const scale = touchDistance(event.touches) / pinchStartDistanceRef.current;
        const { min, max, step } = zoomState;
        const rawZoom = Math.min(max, Math.max(min, pinchStartZoomRef.current * scale));
        const nextZoom = Math.round(rawZoom / step) * step;
        if (nextZoom === zoomState.value) return;
        zoomRef.current = { ...zoomState, value: nextZoom };
        videoTrack.applyConstraints({ advanced: [{ zoom: nextZoom } as MediaTrackConstraintSet] }).catch(() => {
            // Zoom support is optional even when a browser reports the capability.
        });
    }

    function onTouchEnd(event: ReactTouchEvent<HTMLElement>) {
        if (event.touches.length < 2) pinchStartDistanceRef.current = null;
    }

    return {
        videoRef,
        mode,
        isReady,
        isRecording,
        error,
        exposure,
        setExposure,
        zoomHandlers: { onTouchStart, onTouchMove, onTouchEnd },
        setPhotoMode: () => setMode('photo'),
        setVideoMode: () => setMode('video'),
        capture: mode === 'photo' ? capturePhoto : toggleRecording,
        switchCamera: () => setFacingMode((current) => (current === 'environment' ? 'user' : 'environment')),
    };
}
