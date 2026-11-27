import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = ({
  label,
  hint,
  error,
  fullWidth = false,
  className = "",
  id,
  ...props
}: TextareaProps) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const errorId = error ? `${textareaId}-error` : undefined;
  const hintId = hint ? `${textareaId}-hint` : undefined;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full rounded-xl border bg-white resize-none
          transition-colors
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          p-3 text-sm
          ${error
            ? "border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"}
          ${className}
        `}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
};

Textarea.displayName = "Textarea";