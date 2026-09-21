type FieldVariant = "overview" | "baseline" | "autoregressive";

const barHeights: Record<FieldVariant, number[]> = {
  overview: [62, 24, 78, 42, 92, 34, 68, 52, 86, 18, 72, 44, 96, 36, 64, 28, 82, 48, 74, 22, 90, 40, 66, 32, 80, 54, 70, 26, 88, 46, 60, 30],
  baseline: [84, 40, 28, 76, 54, 92, 34, 68, 46, 80, 22, 58, 96, 36, 72, 50, 88, 30, 64, 42, 78, 26, 70, 48, 90, 32, 62, 44, 82, 24, 56, 74],
  autoregressive: [30, 88, 46, 70, 24, 94, 38, 62, 82, 28, 76, 50, 90, 34, 66, 44, 80, 20, 72, 54, 86, 26, 68, 40, 92, 32, 58, 78, 36, 84, 48, 64],
};

const traces: Record<FieldVariant, string> = {
  overview: "M0 104 C70 18 128 28 188 100 S310 178 382 92 S510 20 600 106",
  baseline: "M0 120 C88 118 110 36 194 42 S296 162 372 126 S480 34 600 72",
  autoregressive: "M0 68 C68 22 126 152 206 118 S326 14 402 74 S510 166 600 96",
};

export function SignalField({
  variant,
  label,
}: {
  variant: FieldVariant;
  label: string;
}) {
  return (
    <svg
      className="signal-field"
      viewBox="0 0 600 200"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <rect width="600" height="200" fill="currentColor" />
      <g className="signal-bars">
        {barHeights[variant].map((height, index) => {
          const x = index * 19 + 4;
          return (
            <line
              key={`${variant}-${x}`}
              x1={x}
              x2={x}
              y1={100 - height / 2}
              y2={100 + height / 2}
            />
          );
        })}
      </g>
      <path className="signal-trace" d={traces[variant]} />
      <line className="signal-axis" x1="0" x2="600" y1="100" y2="100" />
    </svg>
  );
}
