'use client';

import { Copy, Download, Loader2, Pencil, Plus, Printer, QrCode, Trash2, X } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, useRef, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventInvitation, useDeleteEventInvitation, useUpdateEventInvitation } from '@/hooks/useEventInvitations';
import { useCreateQrLink, useRevokeQrLink } from '@/hooks/useQrLinks';
import { getFieldErrors } from '@/lib/api/errors';
import type {
    EventInvitationPatchDto,
    EventInvitationRequestDto,
    EventInvitationResponseDto,
    QrLinkRequestDto,
    QrLinkResponseDto,
    QrTargetType,
} from '@/lib/api/types';
import { getQrStatus } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
import { getQrStatusTone, type QrDisplayStatus } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

type InvitationPanel = 'invites' | 'qr';

const formPanelClass = 'mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm';
const fieldLabelClass = 'flex flex-col gap-1.5';
const fieldTextClass = 'text-[11px] font-semibold uppercase tracking-wide text-ink-muted';
const fieldControlClass =
    'rounded-xl border border-transparent bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/30 focus:bg-card focus:ring-2 focus:ring-primary/20';

function InvitationPanelButton({
    item,
    active,
    label,
    onSelect,
}: {
    item: InvitationPanel;
    active: boolean;
    label: string;
    onSelect: (item: InvitationPanel) => void;
}) {
    const handleClick = useCallback(() => {
        onSelect(item);
    }, [item, onSelect]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
        >
            {item === 'qr' && <QrCode className="h-3.5 w-3.5" />}
            {label}
        </button>
    );
}

export default function InvitationsTab({
    t,
    eventId,
    invitations,
    qrLinks,
    canWrite,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitations: EventInvitationResponseDto[];
    qrLinks: QrLinkResponseDto[];
    canWrite: boolean;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [panel, setPanel] = useState<InvitationPanel>('invites');

    const handleShowCreate = useCallback(() => {
        if (!canWrite) return;
        setShowCreate(true);
    }, [canWrite]);

    const handleHideCreate = useCallback(() => {
        setShowCreate(false);
    }, []);

    const handlePanelSelect = useCallback((item: InvitationPanel) => {
        setPanel(item);
        setShowCreate(false);
    }, []);

    const showInvites = panel === 'invites';

    return (
        <div className="px-4 flex flex-col">
            <div className="mb-4 flex gap-1 rounded-full bg-surface-muted p-1">
                {(['invites', 'qr'] as const).map((item) => (
                    <InvitationPanelButton
                        key={item}
                        item={item}
                        active={panel === item}
                        label={t(`invitations.panels.${item}`)}
                        onSelect={handlePanelSelect}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-muted">
                    {showInvites ? t('invitationsCard.summary', { count: invitations.length }) : t('qr.summary', { count: qrLinks.length })}
                </p>
                {!showCreate && canWrite && (
                    <button
                        type="button"
                        onClick={handleShowCreate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {showInvites ? t('invitations.create.cta') : t('qr.create.cta')}
                    </button>
                )}
            </div>

            {!canWrite && (
                <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {showInvites ? t('invitations.readOnly') : t('qr.readOnly')}
                </p>
            )}

            {showCreate && canWrite && showInvites && <CreateInvitationForm t={t} eventId={eventId} onDone={handleHideCreate} />}
            {showCreate && canWrite && !showInvites && (
                <CreateQrLinkForm t={t} eventId={eventId} invitations={invitations} onDone={handleHideCreate} />
            )}

            {showInvites ? (
                <div className="flex flex-col divide-y divide-border">
                    {invitations.map((invitation) => (
                        <InvitationRow key={invitation.id} t={t} eventId={eventId} invitation={invitation} canWrite={canWrite} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-border">
                    {qrLinks.map((qrLink) => (
                        <QrLinkRow key={qrLink.id} t={t} eventId={eventId} qrLink={qrLink} canWrite={canWrite} />
                    ))}
                </div>
            )}

            {showInvites && invitations.length === 0 && !showCreate && (
                <p className="text-sm text-ink-muted text-center py-10">{t('invitations.empty')}</p>
            )}
            {!showInvites && qrLinks.length === 0 && !showCreate && <p className="text-sm text-ink-muted text-center py-10">{t('qr.empty')}</p>}
        </div>
    );
}

function CreateInvitationForm({ t, eventId, onDone }: { t: ReturnType<typeof useTranslations>; eventId: string; onDone: () => void }) {
    const createInvitation = useCreateEventInvitation();
    const createQrLink = useCreateQrLink(eventId);
    const [inviteCode, setInviteCode] = useState('');
    const [maxGuests, setMaxGuests] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [alsoCreateQr, setAlsoCreateQr] = useState(false);

    const fieldErrors = getFieldErrors(createInvitation.error);
    const toErrorMessage = useApiErrorMessage();
    const isSubmitting = createInvitation.isPending || createQrLink.isPending;

    function handleInviteCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setInviteCode(e.target.value);
    }

    function handleMaxGuestsChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(e.target.value)));
    }

    function handleFirstNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFirstName(e.target.value);
    }

    function handleLastNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLastName(e.target.value);
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value);
    }

    function handleAlsoCreateQrChange(e: React.ChangeEvent<HTMLInputElement>) {
        setAlsoCreateQr(e.target.checked);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmedInviteCode = inviteCode.trim();
        const input: EventInvitationRequestDto = {
            eventId,
            inviteCode: trimmedInviteCode,
            maxGuests,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
        };
        try {
            const invitation = await createInvitation.mutateAsync(input);
            if (alsoCreateQr) {
                await createQrLink.mutateAsync({
                    targetType: 'INVITATION',
                    targetId: invitation.id,
                    label: trimmedInviteCode,
                });
            }
            onDone();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className={formPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('invitations.create.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('invitations.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    aria-label={t('invitations.create.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                    <span className={fieldTextClass}>{t('invitations.fields.inviteCode')}</span>
                    <input
                        type="text"
                        required
                        maxLength={100}
                        value={inviteCode}
                        onChange={handleInviteCodeChange}
                        placeholder={t('invitations.placeholders.inviteCode')}
                        className={cn(fieldControlClass, 'placeholder:text-ink-faint')}
                    />
                    {fieldErrors?.inviteCode && <span className="text-xs text-rose-500">{fieldErrors.inviteCode}</span>}
                </label>
                <label className={fieldLabelClass}>
                    <span className={fieldTextClass}>{t('invitations.fields.maxGuests')}</span>
                    <input type="number" required min={1} value={maxGuests} onChange={handleMaxGuestsChange} className={fieldControlClass} />
                </label>
            </div>

            <div className="mt-4 rounded-xl bg-surface-muted/60 p-3">
                <p className="mb-3 text-xs font-semibold text-ink">{t('invitations.create.prefillTitle')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                        <span className={fieldTextClass}>{t('invitations.fields.firstName')}</span>
                        <input type="text" value={firstName} onChange={handleFirstNameChange} className={fieldControlClass} />
                    </label>
                    <label className={fieldLabelClass}>
                        <span className={fieldTextClass}>{t('invitations.fields.lastName')}</span>
                        <input type="text" value={lastName} onChange={handleLastNameChange} className={fieldControlClass} />
                    </label>
                </div>

                <label className={cn(fieldLabelClass, 'mt-3')}>
                    <span className={fieldTextClass}>{t('invitations.fields.email')}</span>
                    <input type="email" value={email} onChange={handleEmailChange} className={fieldControlClass} />
                    {fieldErrors?.email && <span className="text-xs text-rose-500">{fieldErrors.email}</span>}
                </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3">
                <input
                    type="checkbox"
                    checked={alsoCreateQr}
                    onChange={handleAlsoCreateQrChange}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{t('invitations.create.alsoCreateQr')}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{t('invitations.create.alsoCreateQrHint')}</span>
                </span>
            </label>

            {createInvitation.isError && !fieldErrors && <p className="mt-3 text-xs text-rose-500">{toErrorMessage(createInvitation.error)}</p>}
            {createQrLink.isError && <p className="mt-3 text-xs text-rose-500">{toErrorMessage(createQrLink.error)}</p>}

            <button
                type="submit"
                disabled={isSubmitting || !inviteCode.trim()}
                className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('invitations.create.submit')}
            </button>
        </form>
    );
}

function CreateQrLinkForm({
    t,
    eventId,
    invitations,
    onDone,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitations: EventInvitationResponseDto[];
    onDone: () => void;
}) {
    const createQrLink = useCreateQrLink(eventId);
    const [targetType, setTargetType] = useState<QrTargetType>('EVENT_JOIN');
    const [label, setLabel] = useState('');
    const [maxGuests, setMaxGuests] = useState(50);
    const [targetId, setTargetId] = useState(invitations[0]?.id ?? '');
    const toErrorMessage = useApiErrorMessage();

    const isInvitationTarget = targetType === 'INVITATION';

    function handleTargetTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setTargetType(e.target.value as QrTargetType);
    }

    function handleLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLabel(e.target.value);
    }

    function handleMaxGuestsChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(e.target.value)));
    }

    function handleTargetIdChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setTargetId(e.target.value);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const input: QrLinkRequestDto = {
            targetType,
            label: label.trim() || undefined,
            ...(isInvitationTarget ? { targetId } : { maxGuests }),
        };

        try {
            await createQrLink.mutateAsync(input);
            onDone();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className={formPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('qr.create.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('qr.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    aria-label={t('invitations.create.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                    <span className={fieldTextClass}>{t('qr.fields.targetType')}</span>
                    <select value={targetType} onChange={handleTargetTypeChange} className={fieldControlClass}>
                        <option value="EVENT_JOIN">{t('qr.targetTypes.EVENT_JOIN')}</option>
                        <option value="MEDIA_UPLOAD">{t('qr.targetTypes.MEDIA_UPLOAD')}</option>
                        <option value="INVITATION">{t('qr.targetTypes.INVITATION')}</option>
                    </select>
                </label>

                <label className={fieldLabelClass}>
                    <span className={fieldTextClass}>{t('qr.fields.label')}</span>
                    <input
                        type="text"
                        maxLength={100}
                        value={label}
                        onChange={handleLabelChange}
                        placeholder={t('qr.placeholders.label')}
                        className={cn(fieldControlClass, 'placeholder:text-ink-faint')}
                    />
                </label>
            </div>

            {isInvitationTarget ? (
                <label className={cn(fieldLabelClass, 'mt-4')}>
                    <span className={fieldTextClass}>{t('qr.fields.invitation')}</span>
                    <select required value={targetId} onChange={handleTargetIdChange} className={fieldControlClass}>
                        {invitations.map((invitation) => (
                            <option key={invitation.id} value={invitation.id}>
                                {invitation.inviteCode}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <label className={cn(fieldLabelClass, 'mt-4')}>
                    <span className={fieldTextClass}>{t('qr.fields.maxGuests')}</span>
                    <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={maxGuests}
                        onChange={handleMaxGuestsChange}
                        className={fieldControlClass}
                    />
                </label>
            )}

            {isInvitationTarget && invitations.length === 0 && <p className="mt-3 text-xs text-rose-500">{t('qr.noInvitations')}</p>}
            {createQrLink.isError && <p className="mt-3 text-xs text-rose-500">{toErrorMessage(createQrLink.error)}</p>}

            <button
                type="submit"
                disabled={createQrLink.isPending || (isInvitationTarget && !targetId)}
                className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {createQrLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('qr.create.submit')}
            </button>
        </form>
    );
}

function QrLinkRow({
    t,
    eventId,
    qrLink,
    canWrite,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    qrLink: QrLinkResponseDto;
    canWrite: boolean;
}) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const revokeQrLink = useRevokeQrLink(eventId);

    const status: QrDisplayStatus = getQrStatus(qrLink);

    const handleOpenPreview = useCallback(() => {
        setPreviewOpen(true);
    }, []);

    const handleClosePreview = useCallback(() => {
        setPreviewOpen(false);
    }, []);

    const handleOpenRevokeConfirm = useCallback(() => {
        setRevokeConfirmOpen(true);
    }, []);

    const handleCloseRevokeConfirm = useCallback(() => {
        setRevokeConfirmOpen(false);
    }, []);

    async function handleCopy() {
        await navigator.clipboard.writeText(qrLink.publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleRevoke() {
        if (!canWrite) return;
        setRevokeConfirmOpen(false);
        await revokeQrLink.mutateAsync(qrLink.id);
    }

    return (
        <div className="py-4 flex flex-col gap-2 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{qrLink.label || t('qr.untitled')}</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', getQrStatusTone(status))}>
                            {t(`qr.status.${status}`)}
                        </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">{t(`qr.targetTypes.${qrLink.targetType}`)}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">{qrLink.publicUrl}</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleOpenPreview}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        {t('qr.preview')}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? t('invitations.copied') : t('invitations.copyLink')}
                    </button>
                    {canWrite && status === 'ACTIVE' && (
                        <button
                            type="button"
                            onClick={handleOpenRevokeConfirm}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('qr.revoke')}
                        </button>
                    )}
                </div>
            </div>

            <QrPreviewModal t={t} qrLink={qrLink} open={previewOpen} onClose={handleClosePreview} />
            <ConfirmActionModal
                open={revokeConfirmOpen}
                onClose={handleCloseRevokeConfirm}
                onConfirm={handleRevoke}
                title={t('qr.revokeConfirmTitle')}
                body={t('qr.revokeConfirmBody')}
                confirmLabel={t('qr.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={revokeQrLink.isPending}
            />
        </div>
    );
}

function QrPreviewModal({
    t,
    qrLink,
    open,
    onClose,
}: {
    t: ReturnType<typeof useTranslations>;
    qrLink: QrLinkResponseDto;
    open: boolean;
    onClose: () => void;
}) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    function handleDownloadSvg() {
        const svg = svgRef.current;
        if (!svg) return;

        const serialized = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qrLink.label || qrLink.token}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function handlePrint() {
        const svg = svgRef.current;
        if (!svg) return;

        const popup = window.open('', '_blank', 'width=640,height=800');
        if (!popup) return;

        const serialized = new XMLSerializer().serializeToString(svg);
        popup.document.write(`
            <html>
              <head>
                <title>${qrLink.label || 'Storywall QR'}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; text-align: center; color: #241f1a; }
                  .label { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                  .hint { font-size: 14px; margin-bottom: 24px; }
                  svg { width: 320px; height: 320px; }
                  .url { margin-top: 24px; font-size: 11px; word-break: break-all; color: #6f665d; }
                </style>
              </head>
              <body>
                <div class="label">${qrLink.label || 'Storywall'}</div>
                <div class="hint">Scan to open Storywall</div>
                ${serialized}
                <div class="url">${qrLink.publicUrl}</div>
              </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
    }

    return (
        <Modal open={open} onClose={onClose} closeLabel={t('invitations.create.cancel')} size="sm">
            <Modal.Body className="p-6">
                <div className="pr-8">
                    <p className="text-lg font-bold text-ink">{qrLink.label || t('qr.untitled')}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t(`qr.targetTypes.${qrLink.targetType}`)}</p>
                </div>

                <div className="my-6 flex justify-center rounded-2xl bg-white p-5">
                    <QRCodeSVG
                        ref={svgRef}
                        value={qrLink.publicUrl}
                        size={240}
                        level="H"
                        marginSize={4}
                        fgColor="#241f1a"
                        bgColor="#ffffff"
                        title={qrLink.label || t('qr.untitled')}
                        imageSettings={{ src: '/assets/Logo.svg', height: 40, width: 40, excavate: true }}
                    />
                </div>

                <p className="mb-4 break-all rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted">{qrLink.publicUrl}</p>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="flex items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t('qr.downloadSvg')}
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.print')}
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

function InvitationRow({
    t,
    eventId,
    invitation,
    canWrite,
}: {
    t: ReturnType<typeof useTranslations>;
    eventId: string;
    invitation: EventInvitationResponseDto;
    canWrite: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxGuests, setMaxGuests] = useState(invitation.maxGuests);

    const updateInvitation = useUpdateEventInvitation(invitation.id, eventId);
    const deleteInvitation = useDeleteEventInvitation(eventId);

    const guestName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ');
    const isUsed = Boolean(invitation.usedAt);
    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}${routes.inviteToken(invitation.inviteToken)}` : '';

    async function handleCopy() {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function handleSaveEdit() {
        if (!canWrite) return;
        const patch: EventInvitationPatchDto = { maxGuests };
        await updateInvitation.mutateAsync(patch);
        setIsEditing(false);
    }

    async function handleDelete() {
        if (!canWrite) return;
        setDeleteConfirmOpen(false);
        await deleteInvitation.mutateAsync(invitation.id);
    }

    const onMaxGuestsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMaxGuests(Math.max(1, Number(e.target.value)));
    }, []);

    const onStopEditing = useCallback(() => {
        setIsEditing(false);
        setMaxGuests(invitation.maxGuests);
    }, [invitation.maxGuests]);

    const onStartEditing = useCallback(() => {
        if (!canWrite) return;
        setIsEditing(true);
    }, [canWrite]);

    const onConfirmDelete = useCallback(() => {
        if (!canWrite) return;
        setDeleteConfirmOpen(true);
    }, [canWrite]);

    const onCloseDeleteConfirm = useCallback(() => {
        setDeleteConfirmOpen(false);
    }, []);

    return (
        <div className="py-4 flex flex-col gap-2 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{invitation.inviteCode}</p>
                        <span
                            className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                                isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {isUsed ? t('invitations.claimed') : t('invitations.unclaimed')}
                        </span>
                    </div>
                    {(guestName || invitation.email) && (
                        <p className="text-xs text-ink-muted mt-0.5 truncate">{[guestName, invitation.email].filter(Boolean).join(' · ')}</p>
                    )}
                </div>
            </div>

            {isEditing && canWrite ? (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                        {t('invitations.fields.maxGuests')}
                        <input
                            type="number"
                            min={1}
                            value={maxGuests}
                            onChange={onMaxGuestsChange}
                            className="w-16 bg-surface-muted rounded-lg px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                    </label>
                    <button
                        onClick={handleSaveEdit}
                        disabled={updateInvitation.isPending}
                        className="ml-auto px-3 py-1.5 rounded-full bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                        {t('invitations.save')}
                    </button>
                    <button
                        onClick={onStopEditing}
                        className="px-3 py-1.5 rounded-full bg-surface-muted text-ink-muted text-xs font-semibold hover:text-ink transition-colors"
                    >
                        {t('invitations.create.cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-ink-muted">{t('invitations.maxGuests', { count: invitation.maxGuests })}</p>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? t('invitations.copied') : t('invitations.copyLink')}
                        </button>
                        {canWrite && (
                            <>
                                <button
                                    onClick={onStartEditing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t('invitations.edit')}
                                </button>
                                <button
                                    onClick={onConfirmDelete}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-muted text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('invitations.revoke')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <ConfirmActionModal
                open={deleteConfirmOpen}
                onClose={onCloseDeleteConfirm}
                onConfirm={handleDelete}
                title={t('invitations.revokeConfirmTitle')}
                body={t('invitations.revokeConfirmBody')}
                confirmLabel={t('invitations.confirmRevoke')}
                cancelLabel={t('invitations.create.cancel')}
                isConfirming={deleteInvitation.isPending}
            />
        </div>
    );
}
