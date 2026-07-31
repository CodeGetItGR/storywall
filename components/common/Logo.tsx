import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  direction?: 'row' | 'col'
  iconClassName?: string
  wordmarkClassName?: string
  className?: string
}

export function Logo({
  direction = 'row',
  iconClassName = 'h-8 w-auto sm:h-9 md:h-10',
  wordmarkClassName = 'h-6 w-auto sm:h-7 md:h-8',
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', direction === 'col' ? 'flex-col' : 'flex-row', className)}>
      <Image src="/assets/Logo.svg" alt="StoryWall" width={30} height={32} className={iconClassName} />
      <Image src="/assets/LogoText.svg" alt="StoryWall" width={117} height={28} className={wordmarkClassName} />
    </div>
  )
}
