import React from 'react';

interface StatGraphProps {
  data: number[];
  color?: string; // hex or rgb
  height?: number;
  label?: string;
  unit?: string;
  currentValue?: number | string;
  limit?: number;
}

export const StatGraph: React.FC<StatGraphProps> = ({
  data,
  color = '#38bdf8',
  height = 70,
  label,
  unit = '%',
  currentValue,
  limit = 100,
}) => {
  if (!data || data.length === 0) return null;

  const width = 280;
  const maxVal = Math.max(limit, ...data, 1);
  const minVal = 0;

  // Build SVG path points
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - minVal) / (maxVal - minVal)) * (height - 10) - 5;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="flex flex-col gap-1 w-full">
      {(label || currentValue !== undefined) && (
        <div className="flex items-center justify-between text-xs mb-1">
          {label && <span className="font-medium text-slate-400">{label}</span>}
          {currentValue !== undefined && (
            <span className="font-bold tabular-metrics text-slate-200">
              {currentValue} {unit}
            </span>
          )}
        </div>
      )}
      <div className="relative overflow-hidden rounded-xl bg-slate-950/40 p-1 border border-white/5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          style={{ height: `${height}px` }}
        >
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Subtle grid line */}
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
          {/* Filled Area */}
          <path d={areaD} fill={`url(#grad-${color})`} />
          {/* Glowing Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
