'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import type { EventMemberResponseDto, StoryViewResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

interface StoryViewersModalProps {
    open: boolean;
    onClose: () => void;
    viewers: StoryViewResponseDto[];
    loading: boolean;
    membersById: Map<string, EventMemberResponseDto>;
}

export function StoryViewersModal({ open, onClose, viewers, loading, membersById }: StoryViewersModalProps) {
    const t = useTranslations('StoryPage');

    return (
        <Modal open={open} onClose={onClose} size="sm" closeLabel={t('close')}>
            <div className="px-4 py-4">
                <h2 className="text-sm font-bold text-ink mb-3">{loading ? t('loadingViewers') : t('viewedByCount', { count: viewers.length })}</h2>
                {!loading && viewers.length === 0 && <p className="text-sm text-ink-muted">{t('noViewers')}</p>}
                <div className="flex flex-col gap-3">
                    {viewers.map((v) => {
                        const m = membersById.get(v.memberId);
                        const name = m?.displayName ?? t('unknownAuthor');
                        return (
                            <div key={v.id} className="flex items-center gap-3">
                                <Avatar initials={initialsFromName(name)} color={avatarColorFromId(v.memberId)} size="sm" alt={name} />
                                <span className="text-sm text-ink">{name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}
