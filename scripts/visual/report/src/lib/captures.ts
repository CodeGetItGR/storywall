import { type CaptureLocale, LOCALES, type WidthName, WIDTHS } from '../../../config';
import type { ReportEntry } from '../../../types';

export type CaptureChoice = { locale: CaptureLocale; width: WidthName };

// Each language, then each width in it.
export const CAPTURE_ORDER: CaptureChoice[] = LOCALES.flatMap((locale) => WIDTHS.map(({ name }) => ({ locale, width: name })));

export const capturesInOrder = (entries: ReportEntry[]) =>
    CAPTURE_ORDER.flatMap(({ locale, width }) => entries.filter((entry) => entry.locale === locale && entry.width === width));
