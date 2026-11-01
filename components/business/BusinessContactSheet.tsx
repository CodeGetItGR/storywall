'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VENDOR_CONTACT_MESSAGE_MAX } from '@/hooks/useBusinessContact';
import { useBusinessContactFocus } from '@/hooks/useBusinessContactFocus';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import type { VendorContactTopic } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TOPICS: readonly VendorContactTopic[] = ['QUESTION', 'PROBLEM', 'PARTNERSHIP', 'OTHER'];
const TOPIC_IDS: string[] = [...TOPICS];

function isTopic(value: string | undefined): value is VendorContactTopic {
    return TOPICS.some((topic) => topic === value);
}

// "Write to us": a topic, a message, and a short confirmation once sent. It can't be dismissed while sending.
export function BusinessContactSheet({
    topic,
    message,
    topicError,
    messageError,
    sendError,
    sent,
    isSending,
    replyEmail,
    onTopicChangeAction,
    onMessageChangeAction,
    onSubmitAction,
    onCloseAction,
}: {
    topic: VendorContactTopic | null;
    message: string;
    topicError: string | null;
    messageError: string | null;
    sendError: string | null;
    sent: boolean;
    isSending: boolean;
    replyEmail: string | null;
    onTopicChangeAction: (topic: VendorContactTopic) => void;
    onMessageChangeAction: (message: string) => void;
    onSubmitAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('BusinessPage.contact');
    const topicLabelId = useId();
    const topicErrorId = useId();
    const messageErrorId = useId();
    const { sentRef, errorRef } = useBusinessContactFocus(sent, sendError);
    // The one topic Tab lands on: the pick, or the first topic while none is picked.
    const tabStop = topic ?? TOPICS[0];
    const handleTopicKeys = useRadioGroupKeys(TOPIC_IDS, topic, (id) => {
        if (isTopic(id)) onTopicChangeAction(id);
    });

    function handleTopicClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (isTopic(radioId)) onTopicChangeAction(radioId);
    }
    function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
        onMessageChangeAction(event.target.value);
    }
    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmitAction();
    }

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" closeDisabled={isSending} ariaLabel={t('sheetTitle')} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle')}</h2>

                {sent ? (
                    /* Sent */
                    <div className="mt-4 flex flex-col gap-4">
                        <p ref={sentRef} role="status" tabIndex={-1} className="text-sm text-ink outline-none">
                            {replyEmail ? t('sent', { email: replyEmail }) : t('sentNoEmail')}
                        </p>
                        <Button type="button" size="lg" onClick={onCloseAction}>
                            {t('close')}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
                        {/* Topic */}
                        <div className="flex flex-col gap-2">
                            <p id={topicLabelId} className="text-sm text-ink">
                                {t('topic')}
                            </p>
                            <div
                                role="radiogroup"
                                aria-labelledby={topicLabelId}
                                aria-describedby={topicError ? topicErrorId : undefined}
                                onKeyDown={handleTopicKeys}
                                className="grid grid-cols-2 gap-2"
                            >
                                {TOPICS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={topic === value}
                                        data-radio-id={value}
                                        tabIndex={value === tabStop ? 0 : -1}
                                        onClick={handleTopicClick}
                                        className={cn(
                                            'min-h-11 rounded-xl border px-3 text-sm font-medium focus-ring transition-colors',
                                            topic === value ? 'border-primary bg-primary/10 text-ink' : 'border-border bg-background text-ink-muted',
                                        )}
                                    >
                                        {t(`topics.${value}`)}
                                    </button>
                                ))}
                            </div>
                            {topicError && (
                                <p id={topicErrorId} role="alert" className="text-xs text-status-danger">
                                    {topicError}
                                </p>
                            )}
                        </div>

                        {/* Message */}
                        <div className="flex flex-col gap-1">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('message')}
                                <textarea
                                    value={message}
                                    onChange={handleMessageChange}
                                    maxLength={VENDOR_CONTACT_MESSAGE_MAX}
                                    rows={5}
                                    aria-invalid={messageError ? true : undefined}
                                    aria-describedby={messageError ? messageErrorId : undefined}
                                    className="rounded-lg border border-border bg-background px-3 py-2"
                                />
                            </label>
                            {messageError && (
                                <p id={messageErrorId} role="alert" className="text-xs text-status-danger">
                                    {messageError}
                                </p>
                            )}
                        </div>

                        {/* Send error */}
                        {sendError && (
                            <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-status-danger outline-none">
                                {sendError}
                            </p>
                        )}

                        {/* Footer */}
                        <Button type="submit" size="lg" disabled={isSending}>
                            {isSending ? t('sending') : t('send')}
                        </Button>
                    </form>
                )}
            </Modal.Body>
        </Modal>
    );
}
