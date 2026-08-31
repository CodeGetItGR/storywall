import { useCallback, useMemo, useState } from 'react';

import { collaboratorStats } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export type CollaboratorStatusFilter = 'ALL' | CollaboratorResponseDto['status'];

export function useCollaborationsAdmin(collaborators: CollaboratorResponseDto[]) {
    const [statusFilter, setStatusFilter] = useState<CollaboratorStatusFilter>('ALL');
    const [search, setSearch] = useState('');
    const [collaboratorDrawerOpen, setCollaboratorDrawerOpen] = useState(false);
    const [partnerDrawerOpen, setPartnerDrawerOpen] = useState(false);
    const [editingCollaborator, setEditingCollaborator] = useState<CollaboratorResponseDto | null>(null);
    const [managingCollaborator, setManagingCollaborator] = useState<CollaboratorResponseDto | null>(null);

    const stats = useMemo(() => collaboratorStats(collaborators), [collaborators]);

    const visibleCollaborators = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return collaborators.filter((collaborator) => {
            if (statusFilter !== 'ALL' && collaborator.status !== statusFilter) return false;
            if (!needle) return true;
            return collaborator.name.toLowerCase().includes(needle) || collaborator.contactEmail.toLowerCase().includes(needle);
        });
    }, [collaborators, search, statusFilter]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const handleStatusFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusFilter(event.currentTarget.dataset.status as CollaboratorStatusFilter);
    }, []);

    const openCreateCollaborator = useCallback(() => {
        setEditingCollaborator(null);
        setCollaboratorDrawerOpen(true);
    }, []);

    const openEditCollaborator = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const collaboratorId = event.currentTarget.dataset.collaboratorId;
            const collaborator = collaborators.find((item) => item.id === collaboratorId);
            if (!collaborator) return;
            setEditingCollaborator(collaborator);
            setCollaboratorDrawerOpen(true);
        },
        [collaborators]
    );

    const openPartnerDrawer = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const collaboratorId = event.currentTarget.dataset.collaboratorId;
            const collaborator = collaborators.find((item) => item.id === collaboratorId);
            if (!collaborator) return;
            setManagingCollaborator(collaborator);
            setPartnerDrawerOpen(true);
        },
        [collaborators]
    );

    const openEditManagedCollaborator = useCallback(() => {
        if (!managingCollaborator) return;
        setEditingCollaborator(managingCollaborator);
        setCollaboratorDrawerOpen(true);
        setPartnerDrawerOpen(false);
    }, [managingCollaborator]);

    const closeCollaboratorDrawer = useCallback(() => setCollaboratorDrawerOpen(false), []);
    const closePartnerDrawer = useCallback(() => setPartnerDrawerOpen(false), []);

    return {
        collaboratorDrawerOpen,
        editingCollaborator,
        handleSearchChange,
        handleStatusFilterClick,
        managingCollaborator,
        openCreateCollaborator,
        openEditCollaborator,
        openEditManagedCollaborator,
        openPartnerDrawer,
        partnerDrawerOpen,
        search,
        closeCollaboratorDrawer,
        closePartnerDrawer,
        stats,
        statusFilter,
        visibleCollaborators,
    };
}
