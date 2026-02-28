//web/components/auth/RoleGate.tsx
import type { UserRole } from '../../types/user';

export function RoleGate({
  role,
  allow,
  children,
  fallback = null,
}: {
  role: UserRole;
  allow: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return allow.includes(role) ? <>{children}</> : <>{fallback}</>;
}