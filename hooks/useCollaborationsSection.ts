'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminCollaborators } from '@/hooks/useAdmin';
import { filterCollaborators, sortCollaboratorsByName } from '@/lib/adminCollaborations';
import { formatCollaborationsHash, parseCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import type { CollaboratorResponseDto } from '@/lib/api/types';

const EMPTY_COLLABORATORS: CollaboratorResponseDto[] = [];

function currentCollaboratorId(): string | null {
    if (typeof window === 'undefined') return null;
    return parseCollaborationsHash(window.location.hash);
}

export function useCollaborationsSection() {
    const collaboratorsQuery = useAdminCollaborators();
    const [hashId, setHashId] = useState<string | null>(currentCollaboratorId);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        function syncFromHash() {
            setHashId(currentCollaboratorId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const collaborators = useMemo(() => sortCollaboratorsByName(collaboratorsQuery.data ?? EMPTY_COLLABORATORS), [collaboratorsQuery.data]);
    const railCollaborators = useMemo(() => filterCollaborators(collaborators, search), [collaborators, search]);

    // No id, or one that no longer exists, falls back to the first partner.
    const selectedCollaborator = useMemo(
        () => collaborators.find((collaborator) => collaborator.id === hashId) ?? collaborators[0] ?? null,
        [collaborators, hashId],
    );
    const selectedId = selectedCollaborator?.id ?? null;

    // Keep the URL on the partner actually shown, so a refresh or a shared link lands there.
    useEffect(() => {
        if (!collaboratorsQuery.data || selectedId === hashId) return;
        window.history.replaceState(null, '', formatCollaborationsHash(selectedId));
    }, [collaboratorsQuery.data, hashId, selectedId]);

    const selectCollaborator = useCallback((id: string) => {
        setHashId(id);
        window.history.replaceState(null, '', formatCollaborationsHash(id));
    }, []);

    const handleRailClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.collaboratorId;
            if (id) selectCollaborator(id);
        },
        [selectCollaborator],
    );

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const openCreate = useCallback(() => setCreateOpen(true), []);
    const closeCreate = useCallback(() => setCreateOpen(false), []);
    const handleCreated = useCallback((collaborator: CollaboratorResponseDto) => selectCollaborator(collaborator.id), [selectCollaborator]);

    return {
        railCollaborators,
        selectedCollaborator,
        search,
        handleSearchChange,
        handleRailClick,
        createOpen,
        openCreate,
        closeCreate,
        handleCreated,
        isLoading: collaboratorsQuery.isLoading,
        error: collaboratorsQuery.error,
    };
}
