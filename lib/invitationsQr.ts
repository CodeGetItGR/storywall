// The rows of "What guests see" on Invitations & QR codes (KAN-225): what scanning the event's
// code offers a guest, in the scan page's order (see qrLandingPlan).
export type GuestChoiceRow = 'join' | 'invitation' | 'upload' | 'wish';

export function guestChoiceRows({
    showInvitation,
    uploads,
    wishes,
}: {
    showInvitation: boolean;
    uploads: boolean;
    wishes: boolean;
}): GuestChoiceRow[] {
    const rows: GuestChoiceRow[] = ['join'];
    if (showInvitation) rows.push('invitation');
    if (uploads) rows.push('upload');
    if (wishes) rows.push('wish');
    return rows;
}
