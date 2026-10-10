'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useCollaboratorCodes, useSaveCollaborator } from '@/hooks/useAdmin';
import { collaboratorRequestWithStatus, sortCodesActiveFirst } from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

const EMPTY_CODES: CollaborationCodeResponseDto[] = [];

export function useCollaboratorPane(collaborator: CollaboratorResponseDto) {
    const codesQuery = useCollaboratorCodes(collaborator.id);
    const saveStatus = useSaveCollaborator();
    const [editOpen, setEditOpen] = useState(false);
    const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<CollaborationCodeResponseDto | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [businessOpen, setBusinessOpen] = useState(false);
    const [tiersOpen, setTiersOpen] = useState(false);
    const [brandingOpen, setBrandingOpen] = useState(false);
    // Bumped on every open so each drawer remounts with the partner's saved values, not a stale draft.
    const [drawerRun, setDrawerRun] = useState(0);
    // Fixed when the modal opens, so its copy doesn't flip mid-close once the saved status lands.
    const [nextStatus, setNextStatus] = useState<CollaboratorResponseDto['status']>('SUSPENDED');

    const codes = useMemo(() => sortCodesActiveFirst(codesQuery.data ?? EMPTY_CODES), [codesQuery.data]);

    const openEdit = useCallback(() => setEditOpen(true), []);
    const closeEdit = useCallback(() => setEditOpen(false), []);

    const openBusiness = useCallback(() => {
        setDrawerRun((run) => run + 1);
        setBusinessOpen(true);
    }, []);
    const closeBusiness = useCallback(() => setBusinessOpen(false), []);

    const openTiers = useCallback(() => {
        setDrawerRun((run) => run + 1);
        setTiersOpen(true);
    }, []);
    const closeTiers = useCallback(() => setTiersOpen(false), []);

    const openBranding = useCallback(() => {
        setDrawerRun((run) => run + 1);
        setBrandingOpen(true);
    }, []);
    const closeBranding = useCallback(() => setBrandingOpen(false), []);

    const openCreateCode = useCallback(() => {
        setEditingCode(null);
        setCodeDrawerOpen(true);
    }, []);

    const handleEditCodeClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const code = codes.find((item) => item.id === event.currentTarget.dataset.codeId);
            if (!code) return;
            setEditingCode(code);
            setCodeDrawerOpen(true);
        },
        [codes],
    );

    const closeCodeDrawer = useCallback(() => setCodeDrawerOpen(false), []);
    const openLink = useCallback(() => setLinkOpen(true), []);
    const closeLink = useCallback(() => setLinkOpen(false), []);

    const openStatusConfirm = useCallback(() => {
        saveStatus.reset();
        setNextStatus(collaborator.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
        setStatusConfirmOpen(true);
    }, [collaborator.status, saveStatus]);

    const closeStatusConfirm = useCallback(() => setStatusConfirmOpen(false), []);

    const confirmStatusChange = useCallback(async () => {
        try {
            await saveStatus.mutateAsync({ id: collaborator.id, input: collaboratorRequestWithStatus(collaborator, nextStatus) });
            setStatusConfirmOpen(false);
        } catch {
            // Shown in the modal through statusError.
        }
    }, [collaborator, nextStatus, saveStatus]);

    return {
        codes,
        codesLoading: codesQuery.isLoading,
        codesError: codesQuery.error,
        editOpen,
        openEdit,
        closeEdit,
        drawerKey: `${collaborator.id}-${drawerRun}`,
        businessOpen,
        openBusiness,
        closeBusiness,
        tiersOpen,
        openTiers,
        closeTiers,
        brandingOpen,
        openBranding,
        closeBranding,
        codeDrawerOpen,
        editingCode,
        openCreateCode,
        handleEditCodeClick,
        closeCodeDrawer,
        linkOpen,
        openLink,
        closeLink,
        nextStatus,
        statusConfirmOpen,
        openStatusConfirm,
        closeStatusConfirm,
        confirmStatusChange,
        statusSaving: saveStatus.isPending,
        statusError: saveStatus.error,
    };
}
