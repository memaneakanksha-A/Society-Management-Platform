import type { ReactNode } from "react";

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export const FormField = ({
  label,
  hint,
  error,
  required = false,
  children,
  className = "",
}: FormFieldProps) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div>{children}</div>
      {error && <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
    </div>
  );
};

FormField.displayName = "FormField";