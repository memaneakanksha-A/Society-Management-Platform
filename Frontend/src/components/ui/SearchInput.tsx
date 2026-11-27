import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { Icon } from "./icons";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export const SearchInput = ({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
  className = "",
  value: controlledValue,
  onChange,
  ...props
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = useState("");

  const value = controlledValue ?? internalValue;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) setInternalValue(newValue);
    onChange?.(e);
  };

  const handleClear = () => {
    if (controlledValue === undefined) setInternalValue("");
    onChange?.({ target: { value: "" } } as any);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Icon name="search" size={18} className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`
            w-full rounded-xl border bg-white
            transition-colors
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-offset-0
            pl-10 pr-12 py-2.5 text-sm
            border-slate-300 focus:border-indigo-500 focus:ring-indigo-200
          `}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear search"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

SearchInput.displayName = "SearchInput";