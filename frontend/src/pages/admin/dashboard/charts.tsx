import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { inr, niceMax, num, SERIES, ACCENT_COLORS } from "./format";

const GRID = "#f1f5f9";
const AXIS = "#94a3b8";

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, [isInView]);

  const W = 640;
  const H = 260;
  const padL = 56;
  const padR = 16;
  const padT = 20;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = 4;
  const bandW = plotW / data.length;
  const barW = Math.min(48, bandW * 0.5);

  const x = (i: number) => padL + bandW * i + (bandW - barW) / 2;
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue by month">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="barShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#059669" floodOpacity="0.2" />
          </filter>
        </defs>

        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (max / ticks) * i;
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke={GRID} strokeWidth={1} strokeDasharray={i === 0 ? "0" : "4 4"} />
              <text x={padL - 10} y={gy + 4} textAnchor="end" fontSize={10} fill={AXIS} fontFamily="system-ui">
                {prefix}
                {valueFormat(v)}
              </text>
            </g>
          );
        })}

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
              <rect x={padL + bandW * i} y={padT} width={bandW} height={plotH} fill="transparent" />
              <rect
                x={bx}
                y={animated ? by : padT + plotH}
                width={barW}
                height={animated ? Math.max(bh, 0) : 0}
                rx={6}
                fill="url(#barGrad)"
                opacity={active === null || isActive ? 1 : 0.35}
                style={{
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transitionDelay: `${i * 60}ms`,
                  filter: isActive ? "url(#barShadow)" : "none",
                }}
              />
              <text
                x={bx + barW / 2}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize={10}
                fill={isActive ? "#1e1b4b" : AXIS}
                fontWeight={isActive ? 700 : 500}
                fontFamily="system-ui"
                style={{ transition: "fill 200ms, font-weight 200ms" }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-xs text-white z-10"
          style={{
            left: `${((x(active) + barW / 2) / W) * 100}%`,
            top: `${(y(data[active].value) / H) * 100 - 4}%`,
            background: "linear-gradient(135deg, #064e3b, #065f46)",
            boxShadow: "0 8px 24px rgba(6, 78, 59, 0.3)",
          }}
        >
          <div className="font-bold">{data[active].label}</div>
          <div className="tabular-nums text-emerald-200 font-semibold">
            {prefix}
            {valueFormat(data[active].value)}
          </div>
        </motion.div>
      )}
    </div>
  );
}

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
  highlight?: string;
  onItemClick?: (label: string) => void;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, [isInView]);

  if (data.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4l2.25-2.25m0 0l2.25 2.25M12 13.5V7.5" />
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-medium">{emptyLabel}</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul ref={ref} className="space-y-3">
      {data.map((d, i) => {
        const dimmed = highlight != null && highlight !== "" && d.label !== highlight;
        const pct = (d.value / max) * 100;
        return (
          <li key={d.label} className="group" style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity 200ms" }}>
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
              className={onItemClick ? "cursor-pointer rounded-xl p-1.5 -m-1.5 hover:bg-emerald-50/60 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300" : undefined}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className={`truncate font-semibold ${onItemClick ? "text-gray-600 group-hover:text-emerald-600" : "text-gray-700"}`} style={{ color: !onItemClick ? "#334155" : undefined }}>
                  {d.label}
                </span>
                <span className="shrink-0 tabular-nums text-gray-400 font-medium">
                  {format(d.value)}
                  {unit && <span className="text-gray-300 ml-0.5">{unit}</span>}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg, #f1f5f9, #e2e8f0)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    background: `linear-gradient(90deg, ${SERIES}, ${ACCENT_COLORS[i % ACCENT_COLORS.length]})`,
                    transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Donut({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setAnimated(true), 200);
      return () => clearTimeout(t);
    }
  }, [isInView]);

  const pct = total > 0 ? value / total : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  const displayPct = animated ? pct : 0;

  return (
    <div ref={ref} className="flex items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 128 128" className="h-36 w-36 shrink-0 -rotate-90">
          <defs>
            <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="donutShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#059669" floodOpacity="0.25" />
            </filter>
          </defs>
          <circle cx={64} cy={64} r={R} fill="none" stroke="#f1f5f9" strokeWidth={14} />
          <circle
            cx={64}
            cy={64}
            r={R}
            fill="none"
            stroke="url(#donutGrad)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${C * displayPct} ${C}`}
            style={{
              transition: "stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: "url(#donutShadow)",
            }}
          />
          <text
            x={64}
            y={64}
            textAnchor="middle"
            dominantBaseline="central"
            className="rotate-90"
            transform="rotate(90 64 64)"
            fontSize={24}
            fontWeight={800}
            fill="#064e3b"
            fontFamily="system-ui"
          >
            {Math.round(pct * 100)}%
          </text>
        </svg>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }} />
          <span className="text-gray-600 font-medium">
            {label} <span className="font-bold tabular-nums" style={{ color: "#064e3b" }}>{value}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)" }} />
          <span className="text-gray-500 font-medium">
            Remaining <span className="font-bold tabular-nums text-gray-700">{total - value}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
