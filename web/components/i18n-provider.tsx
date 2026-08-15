// web/components/i18n-provider.tsx
'use client';

import '../lib/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}