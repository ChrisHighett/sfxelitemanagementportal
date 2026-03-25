import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ImageCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ImageCard({
  title,
  description,
  imageUrl,
  icon,
  onClick,
  className,
  badge,
  children,
}: ImageCardProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-all",
        onClick && "hover:shadow-md hover:border-primary/30 active:scale-[0.98] cursor-pointer",
        className
      )}
    >
      {/* Image area */}
      {imageUrl && (
        <div className="relative h-32 md:h-36 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {badge && (
            <div className="absolute top-3 left-3">{badge}</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          {icon && !imageUrl && (
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                className="text-sm font-semibold truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h3>
              {onClick && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          {!icon && !imageUrl && badge && <div>{badge}</div>}
        </div>
        {children && <div className="pt-1">{children}</div>}
      </div>
    </Wrapper>
  );
}
