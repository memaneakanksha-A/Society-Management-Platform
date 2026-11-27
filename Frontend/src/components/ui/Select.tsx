import type { SelectHTMLAttributes, OptionHTMLAttributes } from "react";
import { Icon } from "./icons";

export interface SelectOption extends OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = ({
  label,
  hint,
  error,
  options,
  placeholder,
  fullWidth = false,
  className = "",
  id,
  ...props
}: SelectProps) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint ? `${selectId}-hint` : undefined;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full rounded-xl border bg-white appearance-none
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-0
            pl-4 pr-10 py-2.5 text-sm
            ${error
              ? "border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"}
            ${className}
          `}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} {...opt} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <Icon name="chevronDown" size={18} />
        </div>
      </div>
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

Select.displayName = "Select";