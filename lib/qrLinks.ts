import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { QrLinkResolutionDto, QrLinkResponseDto } from '@/lib/api/types';

export type QrTerminalCopyKey = 'unknown' | 'revoked' | 'expired' | 'unavailable';
export type QrUiStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export function getQrTerminalCopyKey(resolution?: QrLinkResolutionDto | null, error?: unknown): QrTerminalCopyKey {
    if (error instanceof ApiError && (error.status === 404 || getErrorCode(error) === ERROR_CODES.QR_LINK_NOT_FOUND)) {
        return 'unknown';
    }

    if (resolution?.status === 'REVOKED') return 'revoked';
    if (resolution?.status === 'EXPIRED') return 'expired';
    if (resolution?.status === 'TARGET_UNAVAILABLE') return 'unavailable';
    return 'unknown';
}

export function getQrStatus(qrLink: QrLinkResponseDto): QrUiStatus {
    if (qrLink.revokedAt) return 'REVOKED';
    if (qrLink.expiresAt && Date.parse(qrLink.expiresAt) <= Date.now()) return 'EXPIRED';
    return 'ACTIVE';
}
