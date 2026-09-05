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
            className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex flex-col items-center gap-3 shrink-0"
        >
            {error && <p className="text-xs text-destructive px-4">{error}</p>}
            {replyingToLabel && (
                <div className="w-full flex items-center justify-between px-4 text-xs text-ink-faint">
                    <span>{replyingToLabel}</span>
                    {onCancelReply && (
                        <button type="button" onClick={onCancelReply} aria-label={cancelReplyAriaLabel} className="text-ink-faint hover:text-ink">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
            <div className="w-full space-y-2">
                <section className="flex gap-3 w-full">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={handleChange}
                        disabled={inputDisabled}
                        placeholder={placeholder}
                        aria-label={inputAriaLabel}
                        maxLength={maxLength}
                        className="relative flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={submitDisabled}
                        aria-label={submitAriaLabel}
                        className="text-primary disabled:text-ink-faint transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </section>
                <p className="text-right text-xs text-ink-faint">
                    {value.length}/{maxLength}
                </p>
            </div>
        </form>
    );
}
