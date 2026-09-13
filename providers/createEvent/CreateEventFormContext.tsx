'use client';

import type React from 'react';
import { createContext, useContext } from 'react';

import type {
    AppEventTypeResponseDto,
    CollaborationCodePreviewResponseDto,
    EventTypeConvention,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';

export type CreateEventStep = 'type' | 'plan' | 'details' | 'overview';

export interface CreateEventFormValue {
    formId: string;
    step: CreateEventStep;
    handleSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
    goToStep: (step: CreateEventStep) => void;
    goToType: () => void;
    goToPlan: () => void;
    goToDetails: () => void;

    // Type step
    eventTypes: AppEventTypeResponseDto[];
    selectedEventType: EventTypeConvention;
    onSelectEventType: (type: EventTypeConvention) => void;
    canContinueType: boolean;

    // Plan step
    eventPlans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    selectedCode: string;
    selectedPlan: PlanTierResponseDto | undefined;
    onSelectPlan: (code: string) => void;
    isPlansLoading: boolean;
    canContinuePlan: boolean;

    // Details step
    title: string;
    titleError?: string;
    onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    startAt: string;
    startAtMin: string;
    startAtMax?: string;
    endAt: string;
    endAtMin: string;
    scheduleError: string | null;
    onStartAtChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onEndAtChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    timezone: string;
    timezoneOptions: string[];
    timezoneError: string | null;
    onTimezoneChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    locationName: string;
    locationNameError?: string;
    onLocationNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    locationAddress: string;
    locationAddressError?: string;
    onLocationAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    mapsUrl: string;
    onMapsUrlChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    canSubmitDetails: boolean;

    // Overview step
    trimmedTitle: string;
    error: string | null;
    hasDraft: boolean;
    checkoutCode: string;
    appliedCheckoutCode: string | null;
    checkoutCodePreview: CollaborationCodePreviewResponseDto | null;
    checkoutCodeError: string | null;
    isCheckingCheckoutCode: boolean;
    onCheckoutCodeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    applyCheckoutCode: () => void;

    isSubmitPending: boolean;
}

export const CreateEventFormContext = createContext<CreateEventFormValue | null>(null);

export function useCreateEventForm(): CreateEventFormValue {
    const context = useContext(CreateEventFormContext);
    if (!context) {
        throw new Error('useCreateEventForm must be used within a CreateEventFormProvider');
    }
    return context;
}
