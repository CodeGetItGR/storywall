import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';

type DetailsTimeZoneProps = {
    zone: string;
    open: boolean;
    onOpen: () => void;
    options: string[];
    error: string | null;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

// "Time zone: Europe/Athens · Change"; Change swaps in today's time zone field.
export function DetailsTimeZone({ zone, open, onOpen, options, error, onChange }: DetailsTimeZoneProps) {
    const t = useTranslations('CreateEventPage');

    if (open) {
        return <EventTimezoneField label={t('fields.timezone')} value={zone} options={options} error={error} onChangeAction={onChange} />;
    }

    return (
        <p className="-mt-2 text-[13px] text-[#6f6257]">
            {t('wizard.details.timeZone', { zone })}
            {' · '}
            <button type="button" onClick={onOpen} className="min-h-11 font-semibold text-ink underline underline-offset-2 focus-ring">
                {t('selection.change')}
            </button>
        </p>
    );
}
