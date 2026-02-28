//web/components/ui/Textarea.tsx
'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const textareaId = id || props.name;
  return (
    <div className="field">
      {label ? <label htmlFor={textareaId} className="label">{label}</label> : null}
      <textarea id={textareaId} className={`input ${className}`.trim()} {...props} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}