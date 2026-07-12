/**
 * TaskwaiLogo — Reusable SVG logo component
 * Bar chart icon: emerald green rounded square + 3 white ascending bars
 */

interface TaskwaiLogoProps {
  /** Size of the icon square in pixels */
  size?: number;
  /** Show "taskwai" text beside the icon */
  showText?: boolean;
  /** Text color class (Tailwind). Defaults to auto based on dark mode. */
  textClassName?: string;
  className?: string;
}

export default function TaskwaiLogo({
  size = 36,
  showText = false,
  textClassName = "text-zinc-900 dark:text-zinc-50",
  className = "",
}: TaskwaiLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: size * 0.234, flexShrink: 0 }}
        aria-label="Taskwai logo"
      >
        {/* Emerald green background */}
        <rect width="512" height="512" rx="120" fill="#10B981" />

        {/* Bar 1 — shortest, left */}
        <rect x="112" y="292" width="80" height="148" rx="18" fill="white" />

        {/* Bar 2 — medium, center */}
        <rect x="216" y="192" width="80" height="248" rx="18" fill="white" />

        {/* Bar 3 — tallest, right */}
        <rect x="320" y="92" width="80" height="348" rx="18" fill="white" />
      </svg>

      {/* Optional wordmark */}
      {showText && (
        <span
          className={`font-bold tracking-tight select-none ${textClassName}`}
          style={{ fontSize: size * 0.45, lineHeight: 1 }}
        >
          taskwai
        </span>
      )}
    </div>
  );
}
