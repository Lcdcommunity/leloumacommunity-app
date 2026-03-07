// web/components/ui/Badge.tsx
import React from 'react'
import { Icon, type IconName } from './Icon'

interface BadgeProps {
  children: React.ReactNode
  tone?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  icon?: IconName
  className?: string
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default:  'bg-gray-100 text-gray-700 border-gray-200',
  neutral:  'bg-gray-100 text-gray-700 border-gray-200',
  success:  'bg-brand-green-soft text-brand-green border-brand-green-soft',
  warning:  'bg-brand-amber-soft text-brand-amber border-brand-amber-soft',
  danger:   'bg-brand-rose-soft text-brand-rose border-brand-rose-soft',
  info:     'bg-brand-blue-soft text-brand-blue border-brand-blue-soft',
  purple:   'bg-brand-purple-soft text-brand-purple border-brand-purple-soft',
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
}

export function Badge({
  children,
  tone = 'default',
  size = 'md',
  icon,
  className = '',
}: BadgeProps) {
  // Rendu riche : si icône ou taille explicite, layout v2 (border + icon)
  if (icon || size === 'sm') {
    return (
      <span
        className={`
          inline-flex items-center rounded-full border font-medium
          ${toneClasses[tone]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
        {children}
      </span>
    )
  }

  // Rendu simple : rétrocompatibilité v1 (badge + badge-{tone})
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {children}
    </span>
  )
}