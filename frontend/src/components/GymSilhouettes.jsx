const Dumbbell = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="0" y="14" width="8" height="28" rx="2" /><rect x="9" y="8" width="9" height="40" rx="2" />
    <rect x="18" y="24" width="36" height="8" rx="2" />
    <rect x="54" y="8" width="9" height="40" rx="2" /><rect x="64" y="14" width="8" height="28" rx="2" />
  </g>
);

const Kettlebell = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <path d="M10 22 C10 2 46 2 46 22 L40 22 C40 10 16 10 16 22 Z" />
    <ellipse cx="28" cy="36" rx="22" ry="18" />
    <rect x="12" y="50" width="32" height="6" rx="2" />
  </g>
);

const Barbell = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="0" y="25" width="120" height="6" rx="3" />
    <rect x="14" y="4" width="10" height="48" rx="2" /><rect x="25" y="12" width="7" height="32" rx="2" />
    <rect x="88" y="12" width="7" height="32" rx="2" /><rect x="96" y="4" width="10" height="48" rx="2" />
  </g>
);

const Bench = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="0" y="22" width="90" height="10" rx="4" />
    <rect x="10" y="32" width="7" height="24" /><rect x="73" y="32" width="7" height="24" />
    <rect x="4" y="52" width="20" height="4" rx="2" /><rect x="66" y="52" width="20" height="4" rx="2" />
  </g>
);

const Plate = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <path fillRule="evenodd" d="M28 2a26 26 0 1 1 0 52a26 26 0 1 1 0-52Zm0 20a6 6 0 1 0 0 12a6 6 0 1 0 0-12Z" />
  </g>
);

// Decorative row of gym equipment silhouettes.
export function GymSilhouettes({ className = "", testId = "gym-silhouettes" }) {
  return (
    <svg viewBox="0 0 560 58" className={className} fill="currentColor" aria-hidden data-testid={testId}>
      <Dumbbell x={0} />
      <Kettlebell x={96} />
      <Barbell x={176} />
      <Bench x={320} />
      <Plate x={434} />
      <Dumbbell x={490} />
    </svg>
  );
}
