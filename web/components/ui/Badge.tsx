//web/components/ui/Badge.tsx
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}