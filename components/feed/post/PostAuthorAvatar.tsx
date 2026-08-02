import {avatarColorFromId, initialsFromName} from "@/lib/utils";
import Avatar from "@/components/ui/avatar";
import {useTranslations} from "next-intl";

export function PostAuthorAvatar({ avatarUrl, name, subtitle, timeAgo }: { avatarUrl?:string | null, name:string, subtitle?:string, timeAgo:{ unit: 'now' | 'minutes' | 'hours' | 'days'; value: number }  }) {
    const t = useTranslations('PostCard')

    return (
    <section className="flex items-center gap-3 group">
      <Avatar
        src={avatarUrl}
        initials={initialsFromName(name)}
        color={avatarColorFromId(name)}
        size="md"
        alt={name}
      />
      <div>
        <p className="text-sm font-semibold text-ink leading-tight">
          {name}
        </p>
        <div className="flex items-center gap-1.5">
          {subtitle && <span className="text-xs text-ink-muted capitalize">{subtitle}</span>}
          {subtitle && <span className="text-ink-faint text-xs">·</span>}
          <span className="text-xs text-ink-muted">
            {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
          </span>
        </div>
      </div>
    </section>
    );
}