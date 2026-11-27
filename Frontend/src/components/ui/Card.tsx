import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  hover?: boolean;
}

export const Card = ({
  children,
  padded = true,
  hover = false,
  className = "",
  ...props
}: CardProps) => {
  return (
    <div
      className={`
        rounded-2xl bg-white shadow-sm border border-slate-200
        ${padded ? "p-5" : ""}
        ${hover ? "hover:shadow-md hover:border-slate-300 transition-shadow transition-colors" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

Card.displayName = "Card";

export const CardHeader = ({
  children,
  className = "",
}: { children: ReactNode; className?: string }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

CardHeader.displayName = "CardHeader";

export const CardTitle = ({
  children,
  className = "",
}: { children: ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>
);

CardTitle.displayName = "CardTitle";

export const CardDescription = ({
  children,
  className = "",
}: { children: ReactNode; className?: string }) => (
  <p className={`mt-1 text-sm text-slate-500 ${className}`}>{children}</p>
);

CardDescription.displayName = "CardDescription";

export const CardContent = ({
  children,
  className = "",
}: { children: ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

CardContent.displayName = "CardContent";

export const CardFooter = ({
  children,
  className = "",
}: { children: ReactNode; className?: string }) => (
  <div className={`mt-4 flex items-center gap-3 ${className}`}>{children}</div>
);

CardFooter.displayName = "CardFooter";