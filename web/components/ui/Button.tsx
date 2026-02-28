//web/components/ui/Button.tsx
'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'btn ' +
    (variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-ghost');

  return (
    <button
      {...props}
      className={`${base} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
    />
  );
}