import { cn } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const sizeMap: Record<AvatarSize, string> = {
  xs:   'w-6 h-6 text-[9px]',
  sm:   'w-8 h-8 text-[11px]',
  md:   'w-10 h-10 text-sm',
  lg:   'w-12 h-12 text-base',
  xl:   'w-16 h-16 text-lg',
  '2xl':'w-20 h-20 text-xl',
}

interface AvatarProps {
  initials?: string
  color?: string
  size?: AvatarSize
  className?: string
  alt?: string
}

export default function Avatar({
  initials = '?',
  color = '#ff7a59',
  size = 'md',
  className,
  alt,
}: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={alt ?? initials}
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white select-none flex-shrink-0',
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
