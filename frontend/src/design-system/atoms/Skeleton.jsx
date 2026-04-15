/**
 * Skeleton.jsx — Atom
 *
 * ZERO business logic. Pure loading placeholder.
 * Mirrors the shape of real content via className prop.
 *
 * Props:
 *   className — controls width, height, and borderRadius of the placeholder
 *   lines     — convenience: renders N stacked skeletons for text blocks
 *   gap       — spacing between lines (Tailwind gap class, default 'gap-2')
 *
 * Single placeholder:
 *   <Skeleton className="h-48 w-full rounded-lg" />
 *
 * Text block (3 lines, last one shorter):
 *   <Skeleton lines={3} />
 *
 * Card skeleton (compose manually):
 *   <div className="flex flex-col gap-3">
 *     <Skeleton className="h-48 w-full rounded-lg" />       image
 *     <Skeleton className="h-4 w-3/4 rounded" />            title
 *     <Skeleton className="h-3 w-1/2 rounded" />            subtitle
 *     <Skeleton className="h-8 w-24 rounded-full" />        badge
 *   </div>
 */

const LINE_WIDTHS = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3', 'w-1/2'];

function SingleSkeleton({ className = 'h-4 w-full rounded' }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.05] ${className}`}
      aria-hidden="true"
    />
  );
}

export default function Skeleton({ className, lines, gap = 'gap-2' }) {
  // Multi-line text skeleton
  if (lines && lines > 1) {
    return (
      <div className={`flex flex-col ${gap}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <SingleSkeleton
            key={i}
            className={`h-3 rounded ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
          />
        ))}
      </div>
    );
  }

  return <SingleSkeleton className={className} />;
}

// Named export for explicit single-skeleton usage
export { SingleSkeleton };
