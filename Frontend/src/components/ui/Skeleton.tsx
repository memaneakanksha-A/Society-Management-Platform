import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = ({
  variant = "text",
  width,
  height,
  className = "",
  ...props
}: SkeletonProps) => {
  const baseStyles = "animate-pulse bg-slate-200 rounded";
  const variantStyles = {
    text: "h-4",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
};

Skeleton.displayName = "Skeleton";

export const SkeletonText = ({ lines = 3, className = "", ...props }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </div>
);

SkeletonText.displayName = "SkeletonText";

export const SkeletonCard = ({ className = "", ...props }: { className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`} {...props}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="80%" />
      </div>
      <Skeleton variant="circular" width={48} height={48} />
    </div>
  </div>
);

SkeletonCard.displayName = "SkeletonCard";