'use client';

import type { ChangeEvent, SubmitEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
    const [firstName = '', ...lastNameParts] = displayName.trim().split(/\s+/).filter(Boolean);
    return { firstName, lastName: lastNameParts.join(' ') };
}

export function useProfileForm() {
    const { user } = useAuth();
    const initialName = useMemo(() => splitDisplayName(user?.displayName ?? ''), [user?.displayName]);
    const [firstName, setFirstName] = useState(initialName.firstName);
    const [lastName, setLastName] = useState(initialName.lastName);
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const profilePhotoUrl = useMemo(() => (profilePhoto ? URL.createObjectURL(profilePhoto) : null), [profilePhoto]);

    useEffect(() => {
        return () => {
            if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
        };
    }, [profilePhotoUrl]);

    function updateProfilePhoto(file: File | null) {
        setProfilePhoto(file);
    }

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setFirstName(event.target.value);
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLastName(event.target.value);
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

    function handlePersonalInfoSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
    }

    function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
    }

    return {
        confirmPassword,
        currentPassword,
        email: user?.email ?? '',
        firstName,
        handleConfirmPasswordChange,
        handleCurrentPasswordChange,
        handleFirstNameChange,
        handleLastNameChange,
        handleNewPasswordChange,
        handlePasswordSubmit,
        handlePersonalInfoSubmit,
        lastName,
        profilePhotoUrl,
        newPassword,
        updateProfilePhoto,
    };
}
