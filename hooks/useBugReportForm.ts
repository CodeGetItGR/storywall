'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useSubmitBugReport } from '@/hooks/useSubmitBugReport';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, getFieldErrors, isBetaFeedbackDisabledError } from '@/lib/api/errors';
import type { AppBetaFeedbackConfigDto } from '@/lib/api/types';
import { BUG_REPORT_DESCRIPTION_MAX, findClipboardImage, isDescriptionValid, isScreenshotTooLarge } from '@/lib/betaFeedback/bugReport';

type ScreenshotProblem = 'tooLarge' | 'unsupported' | null;

function toMegabytes(bytes: number): number {
    return Math.floor(bytes / (1024 * 1024));
}

// 3005 (the whole body) and 3013 (the image) both mean the image is too large.
function isImageTooLargeError(error: unknown): boolean {
    const code = getErrorCode(error);
    return error instanceof ApiError && error.status === 413 && (code === ERROR_CODES.REQUEST_TOO_LARGE || code === ERROR_CODES.MEDIA_FILE_TOO_LARGE);
}

export function useBugReportForm({ config, eventId }: { config: AppBetaFeedbackConfigDto; eventId: string | null }) {
    const t = useTranslations('BugReport');
    const apiErrorMessage = useApiErrorMessage();
    const submitMutation = useSubmitBugReport();
    const [description, setDescription] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotProblem, setScreenshotProblem] = useState<ScreenshotProblem>(null);
    const retryAfter = useRetryAfterCountdown(submitMutation.error);

    const maxMegabytes = toMegabytes(config.screenshotMaxBytes);
    const accept = config.screenshotMimeTypes.join(',');
    const isSent = submitMutation.isSuccess;
    const canSubmit = isDescriptionValid(description) && !screenshotProblem && !submitMutation.isPending && retryAfter === 0;

    const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value), []);

    const selectScreenshot = useCallback(
        (file: File) => {
            setScreenshot(file);
            if (file.type && !config.screenshotMimeTypes.includes(file.type)) setScreenshotProblem('unsupported');
            else if (isScreenshotTooLarge(file, config.screenshotMaxBytes)) setScreenshotProblem('tooLarge');
            else setScreenshotProblem(null);
        },
        [config.screenshotMaxBytes, config.screenshotMimeTypes],
    );

    const handleScreenshotChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = '';
            if (file) selectScreenshot(file);
        },
        [selectScreenshot],
    );

    // A pasted image replaces the current screenshot; pasted text is left alone.
    const handlePaste = useCallback(
        (event: React.ClipboardEvent<HTMLFormElement>) => {
            if (submitMutation.isPending) return;
            const file = findClipboardImage(event.clipboardData);
            if (!file) return;
            event.preventDefault();
            selectScreenshot(file);
        },
        [selectScreenshot, submitMutation.isPending],
    );

    const removeScreenshot = useCallback(() => {
        setScreenshot(null);
        setScreenshotProblem(null);
    }, []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canSubmit) return;
            submitMutation.mutate({ description, screenshot, eventId });
        },
        [canSubmit, description, eventId, screenshot, submitMutation],
    );

    const reset = useCallback(() => {
        setDescription('');
        removeScreenshot();
        submitMutation.reset();
    }, [removeScreenshot, submitMutation]);

    const screenshotError =
        screenshotProblem === 'tooLarge'
            ? t('imageTooLargeMax', { size: maxMegabytes })
            : screenshotProblem === 'unsupported'
              ? t('imageUnsupported')
              : null;

    return {
        accept,
        canSubmit,
        description,
        descriptionMax: BUG_REPORT_DESCRIPTION_MAX,
        handleDescriptionChange,
        handlePaste,
        handleScreenshotChange,
        handleSubmit,
        isSent,
        isSubmitting: submitMutation.isPending,
        maxMegabytes,
        removeScreenshot,
        reset,
        screenshot,
        screenshotError,
        ...describeSubmitError(submitMutation.error, retryAfter, t, apiErrorMessage),
    };
}

function describeSubmitError(
    error: unknown,
    retryAfter: number,
    t: ReturnType<typeof useTranslations<'BugReport'>>,
    apiErrorMessage: (error: unknown) => string,
): { submitError: string | null; fieldErrors: string[] } {
    // 5100 hides the whole feature instead of showing an error.
    if (!error || isBetaFeedbackDisabledError(error)) return { submitError: null, fieldErrors: [] };
    if (isImageTooLargeError(error)) return { submitError: t('imageTooLarge'), fieldErrors: [] };
    if (error instanceof ApiError && error.status === 429) {
        return {
            submitError: retryAfter > 0 ? t('rateLimitedWithWait', { minutes: Math.ceil(retryAfter / 60) }) : t('rateLimited'),
            fieldErrors: [],
        };
    }
    const code = getErrorCode(error);
    if (
        error instanceof ApiError &&
        error.status === 400 &&
        (code === ERROR_CODES.VALIDATION_FAILED || code === ERROR_CODES.MALFORMED_REQUEST_BODY)
    ) {
        const fields = Object.values(getFieldErrors(error) ?? {});
        const detail = error.problem?.detail;
        return { submitError: t('checkFields'), fieldErrors: fields.length > 0 ? fields : detail ? [detail] : [] };
    }
    return { submitError: apiErrorMessage(error), fieldErrors: [] };
}
