'use client';

import { useTranslations } from 'next-intl';

import { PlaylistLeaderboard } from '@/components/playlist/PlaylistLeaderboard';
import { Modal } from '@/components/ui/modal';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';

interface PlaylistLeaderboardSheetProps {
    open: boolean;
    onClose: () => void;
    leaderboard: PlaylistSuggestionLeaderboardDto[];
    isLoading: boolean;
}

export function PlaylistLeaderboardSheet({ open, onClose, leaderboard, isLoading }: PlaylistLeaderboardSheetProps) {
    const t = useTranslations('PlaylistPage');

    return (
        <Modal open={open} onClose={onClose} closeLabel={t('leaderboardTrigger')} variant="sheet" size="md">
            <Modal.Body className="px-4 pt-6 pb-5 sm:px-5">
                <PlaylistLeaderboard leaderboard={leaderboard} isLoading={isLoading} maxVisibleSongs={leaderboard.length} />
            </Modal.Body>
        </Modal>
    );
}
