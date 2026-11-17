'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CampaignPlacementChip } from '@/components/admin/campaigns/CampaignPlacementChip';
import type { useCampaignLinkPicker } from '@/hooks/useCampaignLinkPicker';

const LEGEND = 'mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase';

// Where the links go: each placement is an icon chip (its words on hover, focus or tap, and for screen
// readers), then the languages, the page, and the values Partner and Other need.
export function CampaignLinkPicker({ picker }: { picker: ReturnType<typeof useCampaignLinkPicker> }) {
    const t = useTranslations('AdminPage.campaigns');

    return (
        <div className="space-y-5">
            {/* Placements */}
            <fieldset>
                <legend className={LEGEND}>{t('fields.preset')}</legend>
                <div className="flex flex-wrap gap-2">
                    {picker.options.map(({ option, added, checked, name }) => (
                        <CampaignPlacementChip
                            key={option.placement}
                            option={option}
                            added={added}
                            checked={checked}
                            name={name}
                            onChangeAction={picker.handlePlacementChange}
                        />
                    ))}
                </div>
            </fieldset>

            {/* Languages */}
            <fieldset>
                <legend className={LEGEND}>{t('picker.languages')}</legend>
                <div className="flex flex-wrap gap-x-5">
                    {picker.languageOptions.map(({ language, checked, disabled }) => (
                        <label key={language} className="inline-flex min-h-10 items-center gap-2 text-sm text-ink">
                            <input
                                type="checkbox"
                                value={language}
                                checked={checked}
                                disabled={disabled}
                                onChange={picker.handleLanguageChange}
                                className="h-4 w-4 accent-ink"
                            />
                            {t(`picker.${language}`)}
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Page */}
            <AdminField label={t('fields.page')}>
                <select aria-label={t('fields.page')} className={adminInputClass()} value={picker.pageValue} onChange={picker.handlePageChange}>
                    {picker.pageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </AdminField>

            {/* Partner */}
            {picker.showsPartner && (
                <AdminField
                    label={t('picker.partnerName')}
                    required
                    hint={picker.problem === 'partnerName' ? t('picker.partnerProblem') : undefined}
                    hintTone="warn"
                >
                    <input
                        aria-label={t('picker.partnerName')}
                        aria-invalid={picker.problem === 'partnerName' || undefined}
                        className={adminInputClass('font-mono')}
                        value={picker.partnerName}
                        onChange={picker.handlePartnerNameChange}
                    />
                </AdminField>
            )}

            {/* Other */}
            {picker.showsOther && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField
                        label={t('fields.source')}
                        required
                        hint={picker.problem === 'source' ? t('problems.source') : undefined}
                        hintTone="warn"
                    >
                        <input
                            aria-label={t('fields.source')}
                            aria-invalid={picker.problem === 'source' || undefined}
                            className={adminInputClass('font-mono')}
                            value={picker.utmSource}
                            onChange={picker.handleSourceChange}
                        />
                    </AdminField>
                    <AdminField
                        label={t('fields.medium')}
                        required
                        hint={picker.problem === 'medium' ? t('problems.medium') : undefined}
                        hintTone="warn"
                    >
                        <input
                            aria-label={t('fields.medium')}
                            aria-invalid={picker.problem === 'medium' || undefined}
                            className={adminInputClass('font-mono')}
                            value={picker.utmMedium}
                            onChange={picker.handleMediumChange}
                        />
                    </AdminField>
                </div>
            )}
        </div>
    );
}
