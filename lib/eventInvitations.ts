export function generateInviteCode(): string {
    const randomPart = crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();

    return `INV-${randomPart}`;
}
