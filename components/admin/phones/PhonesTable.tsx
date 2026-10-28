'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { PhonePushPill } from '@/components/admin/phones/PhonePushPill';
import { ADMIN_DEVICE_DATE_FORMAT } from '@/lib/adminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function PhonesTable({ devices, onOpenAction }: { devices: AdminDeviceDto[]; onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
    const t = useTranslations('AdminPage.phones');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="hidden px-3 py-3 font-bold md:table-cell">{t('columns.paired')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.lastSeen')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.notifications')}</th>
                        <th className="w-10 px-2 py-3">
                            <span className="sr-only">{t('open')}</span>
                        </th>
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {devices.map((device) => (
                        <tr key={device.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="w-full max-w-0 px-4 py-3">
                                <span className="block truncate font-semibold text-ink">{device.name}</span>
                            </td>
                            <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted md:table-cell">
                                {formatDate(locale, device.createdAt, ADMIN_DEVICE_DATE_FORMAT)}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {device.lastSeenAt ? formatDate(locale, device.lastSeenAt, ADMIN_DEVICE_DATE_FORMAT) : t('never')}
                            </td>
                            <td className="px-3 py-3">
                                <PhonePushPill enabled={device.pushEnabled} />
                            </td>
                            <td className="px-2 py-3">
                                <button
                                    type="button"
                                    data-device-id={device.id}
                                    onClick={onOpenAction}
                                    aria-label={`${t('open')} ${device.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                >
                                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
