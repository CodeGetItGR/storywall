'use client';

import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
    type CustomProgramIcon,
    customProgramIcon,
    type IconUploadProblem,
    iconUploadProblem,
    type InvitationDraftImageDto,
    isSvgFile,
    svgToPng,
} from '@/lib/invitation/programIconUpload';

// Uploads a program row's own icon to the draft and hands back the icon to store.
export function useProgramIconUpload(draftId: string, onUploaded: (icon: CustomProgramIcon, url: string, mediaId: string) => void) {
    const [problem, setProblem] = useState<IconUploadProblem | null>(null);

    const upload = useMutation({
        mutationFn: async (file: File) => {
            const isSvg = isSvgFile(file);
            const body = new FormData();
            body.append('file', isSvg ? await svgToPng(file) : file);
            const saved = await api.postForm<InvitationDraftImageDto>(endpoints.invitationDrafts.images(draftId), body);
            return { saved, icon: customProgramIcon(saved.mediaId, file.name, isSvg) };
        },
        onSuccess: ({ saved, icon }) => onUploaded(icon, saved.url, saved.mediaId),
        onError: () => setProblem('failed'),
    });

    const onFile = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // The same file can be picked again after a failure.
            event.target.value = '';
            if (!file) return;
            const found = iconUploadProblem(file);
            setProblem(found);
            if (!found) upload.mutate(file);
        },
        [upload],
    );

    return { onFile, problem, isUploading: upload.isPending };
}
