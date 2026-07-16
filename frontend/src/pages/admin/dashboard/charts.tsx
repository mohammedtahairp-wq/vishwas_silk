import { useState } from "react";
import { inr, niceMax, num, SERIES } from "./format";

const GRID = "#ecebf5";
const AXIS = "#9ca3af";

// ────────────────────────────────────────────────────────────────────────────
// Vertical bar / column chart — magnitude over time (e.g. monthly revenue)
// ────────────────────────────────────────────────────────────────────────────
interface Column {
  label: string;
  value: number;
}

export function ColumnChart({
  data,
  valueFormat = inr,
  prefix = "",
}: {
  data: Column[];
  valueFormat?: (n: number) => string;
  prefix?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = 4;
  const bandW = plotW / data.length;
  const barW = Math.min(48, bandW * 0.55);

  const x = (i: number) => padL + bandW * i + (bandW - barW) / 2;
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue by month">
        {/* gridlines + y ticks */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (max / ticks) * i;
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke={GRID} strokeWidth={1} />
              <text x={padL - 8} y={gy + 4} textAnchor="end" fontSize={11} fill={AXIS}>
                {prefix}
                {valueFormat(v)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const bx = x(i);
          const by = y(d.value);
          const bh = padT + plotH - by;
          const isActive = active === i;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {/* full-height hover target */}
              <rect x={padL + bandW * i} y={padT} width={bandW} height={plotH} fill="transparent" />
              <rect
                x={bx}
                y={by}
                width={barW}
                height={Math.max(bh, 0)}
                rx={4}
                fill={SERIES}
                opacity={active === null || isActive ? 1 : 0.45}
                style={{ transition: "opacity 120ms" }}
              />
              <text
                x={bx + barW / 2}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize={11}
                fill={isActive ? "#111827" : AXIS}
                fontWeight={isActive ? 600 : 400}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: `${((x(active) + barW / 2) / W) * 100}%`,
            top: `${(y(data[active].value) / H) * 100}%`,
          }}
        >
          <div className="font-medium">{data[active].label}</div>
          <div className="tabular-nums text-gray-200">
            {prefix}
            {valueFormat(data[active].value)}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Horizontal bars — magnitude by identity, sorted, direct-labeled
// ────────────────────────────────────────────────────────────────────────────
export function BarList({
  data,
  unit = "",
  emptyLabel = "No data yet.",
  format = num,
  highlight,
  onItemClick,
}: {
  data: { label: string; value: number; sub?: string }[];
  unit?: string;
  emptyLabel?: string;
  format?: (n: number) => string;
  /** When set, the bar whose label matches is emphasized and the rest dimmed. */
  highlight?: string;
  /** Makes each row interactive, passing its label to the caller. */
  onItemClick?: (label: string) => void;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3.5">
      {data.map((d) => {
        const dimmed = highlight != null && highlight !== "" && d.label !== highlight;
        return (
          <li key={d.label} className="group" style={{ opacity: dimmed ? 0.4 : 1, transition: "opacity 150ms" }}>
            <div
              role={onItemClick ? "button" : undefined}
              tabIndex={onItemClick ? 0 : undefined}
              aria-label={onItemClick ? `View customers in ${d.label}` : undefined}
              onClick={onItemClick ? () => onItemClick(d.label) : undefined}
              onKeyDown={onItemClick ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onItemClick(d.label);
                }
              } : undefined}
              className={onItemClick ? "cursor-pointer rounded-lg p-1 -m-1 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" : undefined}
            >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={`truncate font-medium text-gray-700 ${onItemClick ? "group-hover:text-indigo-700" : ""}`}>{d.label}</span>
              <span className="shrink-0 tabular-nums text-gray-500">
                {format(d.value)}
                {unit && <span className="text-gray-400"> {unit}</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: SERIES }}
              />
            </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Donut — a single proportion (active vs. inactive)
// ────────────────────────────────────────────────────────────────────────────
export function Donut({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? value / total : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx={64} cy={64} r={R} fill="none" stroke="#f3f4f6" strokeWidth={14} />
        <circle
          cx={64}
          cy={64}
          r={R}
          fill="none"
          stroke={SERIES}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          style={{ transition: "stroke-dasharray 600ms" }}
        />
        <text
          x={64}
          y={64}
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90"
          transform="rotate(90 64 64)"
          fontSize={22}
          fontWeight={700}
          fill="#111827"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES }} />
          <span className="text-gray-700">
            {label} <span className="font-semibold tabular-nums">{value}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="text-gray-500">
            Remaining <span className="font-semibold tabular-nums">{total - value}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
