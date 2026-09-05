'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES,getErrorCode, getErrorMessage, getFieldErrors } from '@/lib/api/errors';
import type { ChangePasswordRequestDto, MeUpdateRequestDto, UserResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type ProfileFieldErrors = Partial<Record<'firstName' | 'lastName', string>>;
type PasswordFieldErrors = Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>;

function toProfileFieldErrors(error: unknown): ProfileFieldErrors {
    const fields = getFieldErrors(error);
    return {
        firstName: fields?.firstName,
        lastName: fields?.lastName,
    };
}

function toPasswordFieldErrors(error: unknown): PasswordFieldErrors {
    const fields = getFieldErrors(error);
    return {
        currentPassword: fields?.currentPassword,
        newPassword: fields?.newPassword,
    };
}

export function useProfileForm() {
    const router = useRouter();
    const { logout, updateProfile, user } = useAuth();
    const toErrorMessage = useApiErrorMessage();
    const profileQuery = useQuery({
        queryKey: ['me'],
        queryFn: () => api.get<UserResponseDto>(endpoints.me.profile),
        enabled: Boolean(user),
    });

    const profile = profileQuery.data;
    const sourceFirstName = profile?.firstName ?? user?.firstName ?? '';
    const sourceLastName = profile?.lastName ?? user?.lastName ?? '';
    const sourceProfilePictureUrl = profile?.profilePictureUrl ?? user?.profilePictureUrl ?? '';

    const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '' });
    const [profileDirty, setProfileDirty] = useState({ firstName: false, lastName: false });
    const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
    const [selectedProfilePictureUrl, setSelectedProfilePictureUrl] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [profileFieldErrors, setProfileFieldErrors] = useState<ProfileFieldErrors>({});
    const [passwordFieldErrors, setPasswordFieldErrors] = useState<PasswordFieldErrors>({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingProfilePicture, setIsSavingProfilePicture] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    useEffect(() => {
        if (profile) updateProfile(profile);
    }, [profile, updateProfile]);

    useEffect(() => {
        return () => {
            if (selectedProfilePictureUrl) URL.revokeObjectURL(selectedProfilePictureUrl);
        };
    }, [selectedProfilePictureUrl]);

    const firstName = profileDirty.firstName ? profileDraft.firstName : sourceFirstName;
    const lastName = profileDirty.lastName ? profileDraft.lastName : sourceLastName;
    const profilePictureUrl = selectedProfilePictureUrl ?? sourceProfilePictureUrl;

    const accountName = useMemo(() => [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || user?.firstName || '', [firstName, lastName, user?.firstName]);
    const canChangePassword = user?.role === 'USER' || user?.role === 'ADMIN';
    const hasProfileChanges = firstName !== sourceFirstName || lastName !== sourceLastName;
    const hasProfilePictureChange = Boolean(selectedProfilePicture);
    const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setProfileDirty((current) => ({ ...current, firstName: true }));
        setProfileDraft((current) => ({ ...current, firstName: event.target.value }));
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setProfileDirty((current) => ({ ...current, lastName: true }));
        setProfileDraft((current) => ({ ...current, lastName: event.target.value }));
    }

    function handleProfilePictureChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        setProfileError(null);
        setProfileSuccess(null);
        if (selectedProfilePictureUrl) URL.revokeObjectURL(selectedProfilePictureUrl);
        setSelectedProfilePictureUrl(file ? URL.createObjectURL(file) : null);
        setSelectedProfilePicture(file);
    }

    function handleCurrentPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setCurrentPassword(event.target.value);
    }

    function handleNewPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setNewPassword(event.target.value);
    }

    function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setConfirmPassword(event.target.value);
    }

    async function handlePersonalInfoSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!hasProfileChanges || isSavingProfile) return;

        setIsSavingProfile(true);
        setProfileError(null);
        setProfileSuccess(null);
        setProfileFieldErrors({});

        const patch: MeUpdateRequestDto = {};
        if (firstName !== sourceFirstName) patch.firstName = firstName;
        if (lastName !== sourceLastName) patch.lastName = lastName;

        try {
            const updated = await api.patch<UserResponseDto>(endpoints.me.profile, patch);
            updateProfile(updated);
            setProfileDraft({ firstName: '', lastName: '' });
            setProfileDirty({ firstName: false, lastName: false });
            setProfileSuccess('updated');
        } catch (error) {
            setProfileFieldErrors(toProfileFieldErrors(error));
            setProfileError(toErrorMessage(error));
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function handleProfilePictureSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        await uploadProfilePicture();
    }

    async function uploadProfilePicture() {
        if (!selectedProfilePicture || isSavingProfilePicture) return;

        setIsSavingProfilePicture(true);
        setProfileError(null);
        setProfileSuccess(null);

        const formData = new FormData();
        formData.append('file', selectedProfilePicture);

        try {
            const updated = await api.postForm<UserResponseDto>(endpoints.me.profilePicture, formData);
            updateProfile(updated);
            if (selectedProfilePictureUrl) URL.revokeObjectURL(selectedProfilePictureUrl);
            setSelectedProfilePicture(null);
            setSelectedProfilePictureUrl(null);
            setProfileSuccess('pictureUpdated');
        } catch (error) {
            setProfileError(toErrorMessage(error, getErrorMessage(error)));
        } finally {
            setIsSavingProfilePicture(false);
        }
    }

    useEffect(() => {
        if (!selectedProfilePicture) return;
        void uploadProfilePicture();
        // Deliberately react only to a newly selected file; the upload guard
        // prevents duplicate submits while the request is in flight.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProfilePicture]);

    async function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canChangePassword || isSavingPassword) return;

        setPasswordError(null);
        setPasswordFieldErrors({});

        if (newPassword !== confirmPassword) {
            setPasswordFieldErrors({ confirmPassword: 'mismatch' });
            return;
        }

        setIsSavingPassword(true);

        try {
            await api.post<void>(endpoints.me.changePassword, {
                currentPassword,
                newPassword,
            } satisfies ChangePasswordRequestDto);
            await logout();
            router.replace(routes.auth.login({ passwordChanged: '1' }));
        } catch (error) {
            const fieldErrors = toPasswordFieldErrors(error);
            setPasswordFieldErrors(fieldErrors);
            if (getErrorCode(error) === ERROR_CODES.INVALID_CREDENTIALS) {
                setPasswordFieldErrors({ ...fieldErrors, currentPassword: 'invalid' });
            }
            if (getErrorCode(error) === ERROR_CODES.VALIDATION_FAILED && !fieldErrors.currentPassword && !fieldErrors.newPassword) {
                setPasswordError('noPassword');
            } else {
                setPasswordError(toErrorMessage(error, getErrorMessage(error)));
            }
        } finally {
            setIsSavingPassword(false);
        }
    }

    return {
        accountName,
        canChangePassword,
        confirmPassword,
        currentPassword,
        firstName,
        email: user?.email ?? '',
        handleConfirmPasswordChange,
        handleCurrentPasswordChange,
        handleFirstNameChange,
        handleLastNameChange,
        handleNewPasswordChange,
        handlePasswordSubmit,
        handlePersonalInfoSubmit,
        handleProfilePictureChange,
        handleProfilePictureSubmit,
        hasProfileChanges,
        hasProfilePictureChange,
        isSavingPassword,
        isSavingProfile,
        isSavingProfilePicture,
        lastName,
        newPassword,
        passwordError,
        passwordFieldErrors,
        passwordMismatch,
        profileError,
        profileFieldErrors,
        profilePictureName: selectedProfilePicture?.name ?? null,
        profilePictureUrl,
        profileQueryError: profileQuery.error ? toErrorMessage(profileQuery.error) : null,
        profileSuccess,
    };
}
