import { MembersPanel } from '@/components/manage/members';
import type { EventMemberResponseDto } from '@/lib/api/types';

export default function MembersTab({ canModerate, eventId, members }: { canModerate: boolean; eventId: string; members: EventMemberResponseDto[] }) {
    return <MembersPanel canModerate={canModerate} eventId={eventId} members={members} />;
}
