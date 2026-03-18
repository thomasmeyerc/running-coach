import { cn } from "@/lib/utils";

interface LogoIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { wrap: "h-8 w-8 rounded-lg", svg: 18, stroke: 3.8 },
  md: { wrap: "h-9 w-9 rounded-lg", svg: 20, stroke: 3.5 },
  lg: { wrap: "h-12 w-12 rounded-xl", svg: 26, stroke: 3.2 },
};

export function LogoIcon({ size = "md", className }: LogoIconProps) {
  const s = sizes[size];
  return (
    <div
      className={cn(
        "flex items-center justify-center brand-gradient",
        s.wrap,
        className
      )}
    >
      <svg
        width={s.svg}
        height={s.svg}
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M13 10 L27 10"
          stroke="white"
          strokeWidth={s.stroke}
          strokeLinecap="round"
        />
        <path
          d="M7 17 L27 17"
          stroke="white"
          strokeWidth={s.stroke}
          strokeLinecap="round"
        />
        <path
          d="M5 24 L19 24"
          stroke="white"
          strokeWidth={s.stroke}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
