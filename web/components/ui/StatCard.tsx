//web/components/ui/StatCard.tsx
import { Icon, type IconName } from './Icon'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: IconName
  color?: 'blue' | 'amber' | 'rose' | 'green' | 'purple' | 'orange'
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  onClick?: () => void
}

const colorClasses = {
  blue: {
    bg: 'bg-brand-blue-soft',
    icon: 'text-brand-blue',
  },
  amber: {
    bg: 'bg-brand-amber-soft',
    icon: 'text-brand-amber',
  },
  rose: {
    bg: 'bg-brand-rose-soft',
    icon: 'text-brand-rose',
  },
  green: {
    bg: 'bg-brand-green-soft',
    icon: 'text-brand-green',
  },
  purple: {
    bg: 'bg-brand-purple-soft',
    icon: 'text-brand-purple',
  },
  orange: {
    bg: 'bg-brand-orange-soft',
    icon: 'text-brand-orange',
  },
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  color = 'blue',
  trend,
  onClick,
}: StatCardProps) {
  const colors = colorClasses[color]

  // Rendu riche : si une icône est fournie, on utilise le layout v2
  if (icon) {
    return (
      <div
        onClick={onClick}
        className={`
          bg-white rounded-xl p-6 shadow-soft border border-gray-100
          hover:shadow-medium transition-all duration-200
          ${onClick ? 'cursor-pointer hover-lift' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`p-2.5 rounded-lg ${colors.bg}`}>
            <Icon name={icon} className={`w-5 h-5 ${colors.icon}`} />
          </span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold text-gray-900">{value}</p>

          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend.positive ? 'text-brand-green' : 'text-brand-rose'}>
                {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="text-gray-400 text-xs">{trend.label}</span>
            </div>
          )}
        </div>

        {hint && <p className="stat-hint mt-2 text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }

  // Rendu simple : pas d'icône, on utilise le layout v1 (Card + classes CSS)
  return (
    <Card>
      <div
        className={`stat-card ${onClick ? 'cursor-pointer hover-lift' : ''}`}
        onClick={onClick}
      >
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </Card>
  )
}