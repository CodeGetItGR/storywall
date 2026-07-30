import Link from "next/link";
import { HeartCrack } from "lucide-react";
import { useTranslations } from "next-intl";

// Shown in place of the feed when /feed/[eventId] doesn't resolve to a real
// event — bad link, typo, or an event that's since been removed. Kept warm
// and non-technical on purpose; the person hitting this is a wedding guest,
// not a developer.
export function EventNotFound() {
  const t = useTranslations("EventNotFound");

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
        <HeartCrack className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">
        {t("title")}
      </h1>
      <p className="text-sm text-ink-muted max-w-sm mb-8 leading-relaxed">
        {t("description")}
      </p>
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
