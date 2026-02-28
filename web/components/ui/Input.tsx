//web/components/ui/Input.tsx
'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="field">
      {label ? <label htmlFor={inputId} className="label">{label}</label> : null}
      <input id={inputId} className={`input ${className}`.trim()} {...props} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}