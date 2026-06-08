"use client";

import { AlertCircle } from "lucide-react";

interface ValidationErrorsProps {
  errors: Record<string, string>;
  className?: string;
}

export function ValidationErrors({ errors, className = "" }: ValidationErrorsProps) {
  const errorList = Object.entries(errors);
  if (errorList.length === 0) return null;

  return (
    <div className={`rounded-md bg-destructive/10 border border-destructive/20 p-3 ${className}`}>
      {errorList.map(([field, message]) => (
        <div key={field} className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
}

interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}
