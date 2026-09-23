'use client';

import { Send, X } from 'lucide-react';
import type React from 'react';
import { type ChangeEvent, useEffect, useRef } from 'react';

interface PostCommentFormProps {
    value: string;
    onValueChange: (value: string) => void;
    onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
    error: string | null;
    submitDisabled: boolean;
    inputDisabled?: boolean;
    placeholder: string;
    inputAriaLabel: string;
    submitAriaLabel: string;
    maxLength: number;
    replyingToLabel?: string | null;
    onCancelReply?: () => void;
    cancelReplyAriaLabel?: string;
}

export function PostCommentForm({
    value,
    onValueChange,
    onSubmit,
    error,
    submitDisabled,
    inputDisabled,
    placeholder,
    inputAriaLabel,
    submitAriaLabel,
    maxLength,
    replyingToLabel,
    onCancelReply,
    cancelReplyAriaLabel,
}: PostCommentFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (replyingToLabel) inputRef.current?.focus();
    }, [replyingToLabel]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        onValueChange(e.target.value.slice(0, maxLength));
    }

    return (
        <form
            onSubmit={onSubmit}
            className="flex shrink-0 flex-col items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm"
        >
            {error && <p className="px-4 text-xs text-destructive">{error}</p>}
            {replyingToLabel && (
                <div className="flex w-full items-center justify-between px-4 text-xs text-ink-faint">
                    <span className="min-w-0 truncate" title={replyingToLabel}>
                        {replyingToLabel}
                    </span>
                    {onCancelReply && (
                        <button
                            type="button"
                            onClick={onCancelReply}
                            aria-label={cancelReplyAriaLabel}
                            className="shrink-0 text-ink-faint hover:text-ink"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}
            <div className="w-full space-y-2">
                <section className="flex w-full gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={handleChange}
                        disabled={inputDisabled}
                        placeholder={placeholder}
                        aria-label={inputAriaLabel}
                        maxLength={maxLength}
                        className="relative flex-1 rounded-full bg-surface-muted px-4 py-2.5 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={submitDisabled}
                        aria-label={submitAriaLabel}
                        className="text-primary transition-colors disabled:text-ink-faint"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </section>
                <p className="text-right text-xs text-ink-faint">
                    {value.length}/{maxLength}
                </p>
            </div>
        </form>
    );
}
