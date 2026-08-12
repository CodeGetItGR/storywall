export function extractInviteToken(value: string): string {
    const trimmed = value.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
}
