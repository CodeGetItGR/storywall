'use client';

import React, { useState } from 'react';

import type { PaidServiceResponseDto } from '@/lib/api/types';

export interface StoragePackSelection {
    selectedService: PaidServiceResponseDto | undefined;
    handleSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function useStoragePackSelection(services: PaidServiceResponseDto[]): StoragePackSelection {
    const [selectedCode, setSelectedCode] = useState(() => services[0]?.code ?? '');
    const selectedService = services.find((service) => service.code === selectedCode) ?? services[0];

    function handleSelect(event: React.MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.serviceCode;
        if (code) {
            setSelectedCode(code);
        }
    }

    return { selectedService, handleSelect };
}
