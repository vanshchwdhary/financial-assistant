"use client";

import { type MotionValue, motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Ticker = "AAPL" | "MSFT" | "NVDA" | "TSLA" | "AMZN";
type Timeframe = "1D" | "1W" | "1M" | "3M";
type Duration = "1W" | "1M" | "3M" | "1Y";

type Ohlc = {
  open: number;
  high: number;
  low: number;
  close: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      const eased = easeOutCubic(t);
      const next = from + (to - from) * eased;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, target]);

  return value;
}

function generateSeries(length: number, start: number, volatility: number) {
  const series: Ohlc[] = [];
  let lastClose = start;
  for (let i = 0; i < length; i += 1) {
    const drift = (Math.random() - 0.48) * volatility;
    const open = lastClose;
    const close = clamp(open + drift, 0.5, 10_000);
    const wick = Math.abs(drift) * (0.55 + Math.random() * 0.8) + volatility * 0.4;
    const high = Math.max(open, close) + wick * (0.35 + Math.random() * 0.6);
    const low = Math.min(open, close) - wick * (0.35 + Math.random() * 0.6);
    series.push({ open, high, low, close });
    lastClose = close;
  }
  return series;
}

function sma(values: number[], period: number) {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) {
      result.push(null);
      continue;
    }
    const window = values.slice(i + 1 - period, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  return result;
}

function formatPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "teal" | "violet";
}) {
  const toneClasses =
    tone === "teal"
      ? "from-teal-400/20 via-teal-400/10 to-teal-400/0 ring-teal-400/25"
      : tone === "violet"
        ? "from-violet-400/20 via-violet-400/10 to-violet-400/0 ring-violet-400/25"
        : "from-sky-400/20 via-sky-400/10 to-sky-400/0 ring-sky-400/25";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        "bg-gradient-to-r",
        toneClasses,
        "ring-1 text-white/90 backdrop-blur",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={[
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3",
        "bg-gradient-to-r from-sky-400 via-teal-300 to-violet-400",
        "text-sm font-semibold text-slate-950 shadow-[0_20px_80px_-20px_rgba(45,212,191,0.55)]",
        "ring-1 ring-white/15 transition-transform duration-300 hover:-translate-y-0.5",
      ].join(" ")}
    >
      <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="absolute -inset-y-10 left-0 w-1/3 -translate-x-1/2 bg-white/25 blur-xl animate-[shimmer_2.8s_ease-in-out_infinite]" />
      </span>
      <span className="relative">{children}</span>
    </a>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={[
        "group relative inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold",
        "bg-white/[0.02] text-white/90 ring-1 ring-white/15 backdrop-blur transition-all duration-300",
        "hover:bg-white/[0.05] hover:ring-white/25 hover:-translate-y-0.5",
      ].join(" ")}
    >
      <span className="relative">{children}</span>
    </a>
  );
}

function StockCanvasBackground({
  parallaxX,
  parallaxY,
}: {
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const points = new Array(140).fill(0).map((_, i) => ({
      x: i,
      y: 0.5 + Math.sin(i / 12) * 0.12 + (Math.random() - 0.5) * 0.06,
    }));

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let t = 0;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const ox = parallaxX.get() * 12;
      const oy = parallaxY.get() * 10;

      // faint vignette
      const vignette = ctx.createRadialGradient(
        width / 2 + ox * 0.35,
        height / 2 + oy * 0.35,
        Math.min(width, height) * 0.1,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7,
      );
      vignette.addColorStop(0, "rgba(45,212,191,0.10)");
      vignette.addColorStop(0.55, "rgba(59,130,246,0.08)");
      vignette.addColorStop(1, "rgba(11,15,25,0.0)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // animate signal
      t += 0.012;
      const noise = (n: number) => (Math.sin(n * 3.1 + t) + Math.sin(n * 1.7 - t * 1.4)) * 0.06;
      for (let i = 0; i < points.length; i += 1) {
        const base = 0.52 + Math.sin((i + t * 20) / 22) * 0.12 + noise(i / 18);
        points[i].y = base + (Math.random() - 0.5) * 0.01;
      }

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(56,189,248,0.0)");
      gradient.addColorStop(0.18, "rgba(56,189,248,0.65)");
      gradient.addColorStop(0.55, "rgba(45,212,191,0.8)");
      gradient.addColorStop(0.86, "rgba(167,139,250,0.7)");
      gradient.addColorStop(1, "rgba(167,139,250,0.0)");

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = (1 - p.y) * height;
        if (i === 0) ctx.moveTo(x + ox, y + oy);
        else ctx.lineTo(x + ox, y + oy);
      });
      ctx.stroke();

      // glow
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(45,212,191,0.08)";
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [parallaxX, parallaxY]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-90 [filter:drop-shadow(0_0_40px_rgba(45,212,191,0.08))]"
    />
  );
}

function FloatingIndicator({
  label,
  tone,
  style,
  delay = 0,
}: {
  label: string;
  tone: "blue" | "teal" | "violet";
  style: CSSProperties;
  delay?: number;
}) {
  const ring =
    tone === "teal"
      ? "ring-teal-400/25 bg-teal-400/10"
      : tone === "violet"
        ? "ring-violet-400/25 bg-violet-400/10"
        : "ring-sky-400/25 bg-sky-400/10";

  return (
    <motion.div
      className={[
        "pointer-events-none absolute rounded-full px-3 py-1.5 text-xs font-medium text-white/85",
        "backdrop-blur",
        "ring-1",
        ring,
      ].join(" ")}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
    >
      {label}
    </motion.div>
  );
}

function ChartLineIcon() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="text-sky-300"
      aria-hidden="true"
    >
      <motion.path
        d="M4 19.5 L10.2 13.8 L14.2 16.6 L22.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <path
        d="M4 23.5H24"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

function SlidersIcon() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="text-teal-200"
      aria-hidden="true"
    >
      <path
        d="M6 8H22"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 20H22"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.circle
        cx="12"
        cy="8"
        r="3"
        fill="currentColor"
        initial={{ x: -2 }}
        animate={{ x: [0, 7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="18"
        cy="20"
        r="3"
        fill="currentColor"
        initial={{ x: 2 }}
        animate={{ x: [0, -8, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

function BrainIcon() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="text-violet-200"
      aria-hidden="true"
    >
      <path
        d="M10 5.8c-2.4 0-4.4 2-4.4 4.4 0 .9.2 1.7.7 2.4-.8.7-1.3 1.7-1.3 2.8 0 2.1 1.7 3.8 3.8 3.8h.3c.6 1.7 2.2 2.9 4.1 2.9h.2"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 5.8c2.4 0 4.4 2 4.4 4.4 0 .9-.2 1.7-.7 2.4.8.7 1.3 1.7 1.3 2.8 0 2.1-1.7 3.8-3.8 3.8h-.3c-.6 1.7-2.2 2.9-4.1 2.9h-.2"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.circle
        cx="14"
        cy="10.2"
        r="2.2"
        fill="currentColor"
        animate={{ opacity: [0.35, 0.95, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone: "blue" | "teal" | "violet";
}) {
  const glow =
    tone === "teal"
      ? "hover:shadow-[0_0_0_1px_rgba(45,212,191,0.25),0_18px_70px_-24px_rgba(45,212,191,0.45)]"
      : tone === "violet"
        ? "hover:shadow-[0_0_0_1px_rgba(167,139,250,0.28),0_18px_70px_-24px_rgba(167,139,250,0.45)]"
        : "hover:shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_18px_70px_-24px_rgba(56,189,248,0.45)]";

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={[
        "group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur",
        "shadow-[0_18px_70px_-42px_rgba(0,0,0,0.9)]",
        glow,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/10">
          {icon}
        </div>
        <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
          {title}
        </h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-20 bg-gradient-to-r from-sky-400/10 via-teal-400/10 to-violet-400/10 blur-2xl" />
      </div>
    </motion.div>
  );
}

function DashboardChart({
  series,
  trend,
}: {
  series: Ohlc[];
  trend: "Bullish" | "Bearish";
}) {
  const width = 640;
  const height = 320;
  const padX = 18;
  const padY = 22;
  const candleBodyWidth = 7;
  const wickWidth = 2;

  const highs = series.map((d) => d.high);
  const lows = series.map((d) => d.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  const xStep = (width - padX * 2) / Math.max(1, series.length - 1);

  const priceToY = (p: number) => padY + ((max - p) / range) * (height - padY * 2);
  const xAt = (i: number) => padX + i * xStep;

  const closes = series.map((d) => d.close);
  const ma = sma(closes, 9);

  const maPath = ma
    .map((v, i) => (v == null ? null : `${i === 0 ? "M" : "L"}${xAt(i)},${priceToY(v)}`))
    .filter(Boolean)
    .join(" ");

  const arrowColor = trend === "Bullish" ? "#2dd4bf" : "#fb7185";

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19]/60">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label="Animated candlestick preview"
      >
        {/* grid */}
        <g opacity="0.22">
          {new Array(7).fill(0).map((_, i) => {
            const y = padY + (i / 6) * (height - padY * 2);
            return (
              <line
                key={i}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgba(120,134,180,0.28)"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* candles */}
        {series.map((d, i) => {
          const x = xAt(i);
          const up = d.close >= d.open;
          const color = up ? "rgba(45,212,191,0.9)" : "rgba(248,113,113,0.9)";
          const yOpen = priceToY(d.open);
          const yClose = priceToY(d.close);
          const yHigh = priceToY(d.high);
          const yLow = priceToY(d.low);
          const bodyY = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yOpen - yClose));

          return (
            <g key={i} opacity={0.95}>
              <line
                x1={x}
                x2={x}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth={wickWidth}
                strokeLinecap="round"
              />
              <rect
                x={x - candleBodyWidth / 2}
                y={bodyY}
                width={candleBodyWidth}
                height={bodyH}
                rx={2}
                fill={color}
              />
            </g>
          );
        })}

        {/* moving average */}
        <motion.path
          d={maPath}
          fill="none"
          stroke="rgba(56,189,248,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        className="pointer-events-none absolute right-4 top-4 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10 backdrop-blur"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        Trend {trend}
        <span
          className="ml-2 inline-block"
          style={{ color: arrowColor }}
          aria-hidden="true"
        >
          {trend === "Bullish" ? "↗" : "↘"}
        </span>
      </motion.div>
    </div>
  );
}

function ArchitectureFlow() {
  const steps = [
    "User Input",
    "Data Fetch API",
    "Analytics Engine",
    "Prediction Model",
    "Interactive Chart Output",
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-violet-400/10" />

      <div className="relative grid gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-tight text-white">
            Architecture
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/70">
            A clean flow from parameter tuning to model inference — visualized as a
            data pipeline.
          </p>
        </div>

        <div className="hidden items-center justify-center md:flex">
          <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 520 240"
            className="h-[240px] w-full"
            aria-hidden="true"
          >
            {steps.map((label, i) => {
              const x = 26 + i * 95;
              const y = 120 + Math.sin(i * 1.2) * 10;
              return (
                <g key={label}>
                  {i > 0 ? (
                    <motion.path
                      d={`M${x - 70},${y} C${x - 45},${y - 28} ${x - 30},${y + 28} ${x - 8},${y}`}
                      fill="none"
                      stroke="rgba(45,212,191,0.55)"
                      strokeWidth="2"
                      strokeDasharray="6 10"
                      initial={{ strokeDashoffset: 120, opacity: 0.25 }}
                      animate={{ strokeDashoffset: 0, opacity: 0.9 }}
                      transition={{
                        duration: 1.6,
                        delay: 0.2 + i * 0.12,
                        ease: "easeInOut",
                      }}
                    />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r="16"
                    fill="rgba(255,255,255,0.04)"
                    stroke="rgba(255,255,255,0.12)"
                  />
                  <circle cx={x} cy={y} r="6" fill="rgba(45,212,191,0.85)" />
                  <text
                    x={x}
                    y={y + 40}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.72)"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function ImpactList() {
  const items = [
    "Built real-time stock visualization assistant",
    "Implemented stop-loss & duration parameter tuning",
    "Integrated predictive analytics for trading insights",
    "Designed interactive dashboard UI",
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur">
      <h3 className="font-heading text-xl font-semibold tracking-tight text-white">
        Resume-ready impact
      </h3>
      <ul className="mt-5 grid gap-3">
        {items.map((text, i) => (
          <motion.li
            key={text}
            className="flex items-start gap-3 rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5"
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.08 }}
          >
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-400/10 ring-1 ring-teal-400/25">
              <svg
                viewBox="0 0 20 20"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 10.5l3.2 3.2L16 5.9"
                  stroke="rgba(45,212,191,0.95)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-sm leading-6 text-white/80">{text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stop = useCallback(() => {
    try {
      oscRef.current?.stop();
      oscRef.current?.disconnect();
      gainRef.current?.disconnect();
      audioRef.current?.close();
    } catch {
      // ignore
    } finally {
      oscRef.current = null;
      gainRef.current = null;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const toggle = () => {
    if (on) {
      stop();
      setOn(false);
      return;
    }

    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.0009;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 74;
    osc.connect(gain);
    osc.start();

    audioRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setOn(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
        "bg-white/[0.02] text-white/80 ring-1 ring-white/12 backdrop-blur",
        "transition-colors hover:bg-white/[0.05] hover:ring-white/20",
      ].join(" ")}
      aria-pressed={on}
    >
      <span
        className={[
          "inline-flex h-2 w-2 rounded-full",
          on ? "bg-teal-300 shadow-[0_0_0_6px_rgba(45,212,191,0.10)]" : "bg-white/40",
        ].join(" ")}
      />
      Terminal sound
    </button>
  );
}

export default function AIFinancialAssistantSection() {
  const tickers = useMemo(
    () => [
      { symbol: "AAPL", change: 1.24 },
      { symbol: "MSFT", change: 0.58 },
      { symbol: "NVDA", change: 2.91 },
      { symbol: "TSLA", change: -1.03 },
      { symbol: "AMZN", change: 0.32 },
      { symbol: "META", change: 0.87 },
      { symbol: "BTC", change: 1.62 },
      { symbol: "ETH", change: 0.74 },
    ],
    [],
  );

  const [ticker, setTicker] = useState<Ticker>("AAPL");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [stopLoss, setStopLoss] = useState(12);
  const [duration, setDuration] = useState<Duration>("3M");

  const basePrice = useMemo(() => {
    const map: Record<Ticker, number> = {
      AAPL: 187,
      MSFT: 422,
      NVDA: 893,
      TSLA: 241,
      AMZN: 178,
    };
    return map[ticker];
  }, [ticker]);

  const volatility = useMemo(() => {
    const tf: Record<Timeframe, number> = { "1D": 3.4, "1W": 5.2, "1M": 7.2, "3M": 9.1 };
    return tf[timeframe];
  }, [timeframe]);

  const [series, setSeries] = useState<Ohlc[]>(() => generateSeries(46, basePrice, volatility));

  useEffect(() => {
    setSeries(generateSeries(46, basePrice, volatility));
  }, [basePrice, volatility]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const next = generateSeries(1, last.close, volatility)[0];
        return [...prev.slice(1), next];
      });
    }, 1300);
    return () => window.clearInterval(id);
  }, [volatility]);

  const trend = useMemo(() => {
    const first = series[0]?.close ?? 0;
    const last = series[series.length - 1]?.close ?? 0;
    return last >= first ? "Bullish" : "Bearish";
  }, [series]);

  const confidenceTarget = useMemo(() => {
    const first = series[0]?.close ?? 0;
    const last = series[series.length - 1]?.close ?? 0;
    const momentum = Math.abs((last - first) / Math.max(1, first)) * 100;
    const volatilityPenalty = clamp(volatility / 10, 0, 1) * 10;
    const stopLossBoost = clamp(stopLoss / 25, 0, 1) * 6;
    const durationBoost = duration === "1Y" ? 5 : duration === "3M" ? 3 : duration === "1M" ? 1 : 0;
    return Math.round(clamp(74 + momentum * 2.4 - volatilityPenalty + stopLossBoost + durationBoost, 62, 92));
  }, [duration, series, stopLoss, volatility]);

  const confidence = useCountUp(confidenceTarget, 900);

  const heroRef = useRef<HTMLElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(560px circle at ${mx}px ${my}px, rgba(56,189,248,0.18), rgba(11,15,25,0) 55%)`;

  const onHeroMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mx.set(x);
      my.set(y);
      const nx = (x / rect.width - 0.5) * 2;
      const ny = (y / rect.height - 0.5) * 2;
      px.set(clamp(nx, -1, 1));
      py.set(clamp(ny, -1, 1));
    },
    [mx, my, px, py],
  );

  return (
    <section
      ref={heroRef}
      id="ai-financial-assistant"
      className="relative overflow-hidden"
      onPointerMove={onHeroMove}
    >
      {/* Hero */}
      <div className="relative flex min-h-[100svh] items-center">
        <div className="absolute inset-0 bg-grid opacity-25" />
        <StockCanvasBackground parallaxX={px} parallaxY={py} />
        <motion.div className="absolute inset-0" style={{ backgroundImage: glow }} />

        <div className="absolute inset-x-0 top-5 z-10">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Badge tone="teal">LIVE • Streaming</Badge>
              <Badge tone="blue">AI Analytics</Badge>
            </div>
            <SoundToggle />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto w-full max-w-6xl px-6 pb-8">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur">
              <div className="flex w-[200%] animate-[ticker-scroll_26s_linear_infinite] gap-6 px-5 py-3 text-xs text-white/70">
                {[...tickers, ...tickers].map((t, i) => (
                  <div key={`${t.symbol}-${i}`} className="flex items-center gap-2">
                    <span className="font-semibold text-white/85">{t.symbol}</span>
                    <span
                      className={t.change >= 0 ? "text-teal-300" : "text-rose-300"}
                    >
                      {formatPct(t.change)}
                    </span>
                    <span className="text-white/40">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <FloatingIndicator
          label="RSI"
          tone="blue"
          style={{ top: "18%", left: "8%" }}
          delay={0.25}
        />
        <FloatingIndicator
          label="EMA(20)"
          tone="teal"
          style={{ top: "28%", right: "10%" }}
          delay={0.35}
        />
        <FloatingIndicator
          label="MACD"
          tone="violet"
          style={{ bottom: "24%", left: "14%" }}
          delay={0.45}
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-heading text-sm font-semibold tracking-wide text-white/70">
                Project Section
              </span>
              <span className="h-1 w-1 rounded-full bg-white/35" />
              <span className="text-sm text-white/55">Dark fintech dashboard</span>
            </div>

            <h1 className="font-heading mt-5 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              AI Financial Assistant
            </h1>
            <p className="mt-6 text-base leading-7 text-white/72 md:text-lg md:leading-8">
              Real-time stock visualization and predictive analytics powered by intelligent
              parameter tuning.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <PrimaryButton href="#dashboard">View Live Demo</PrimaryButton>
              <SecondaryButton href="https://github.com/">View GitHub</SecondaryButton>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-white/55">
              <span className="rounded-full bg-white/[0.03] px-3 py-1 ring-1 ring-white/10">
                Candlesticks
              </span>
              <span className="rounded-full bg-white/[0.03] px-3 py-1 ring-1 ring-white/10">
                Moving averages
              </span>
              <span className="rounded-full bg-white/[0.03] px-3 py-1 ring-1 ring-white/10">
                Confidence scoring
              </span>
              <span className="rounded-full bg-white/[0.03] px-3 py-1 ring-1 ring-white/10">
                Interactive controls
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Feature highlights
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70 md:text-base">
              Built to feel intelligent, data-driven, and interactive — like a real trading
              dashboard.
            </p>
          </div>
          <Badge tone="violet">Framer Motion • Stagger</Badge>
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<ChartLineIcon />}
            title="Real-Time Stock Charts"
            description="Generates live candlestick visualizations using streaming market data."
            tone="blue"
          />
          <FeatureCard
            icon={<SlidersIcon />}
            title="Custom Investment Parameters"
            description="Supports stop-loss thresholds, risk levels, and investment duration tuning."
            tone="teal"
          />
          <FeatureCard
            icon={<BrainIcon />}
            title="Predictive Trend Intelligence"
            description="Applies analytics models to forecast directional price movement."
            tone="violet"
          />
        </div>
      </div>

      {/* Interactive Dashboard Preview */}
      <div id="dashboard" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Interactive dashboard preview
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/70 md:text-base">
                Tune parameters on the left — watch the chart and prediction react instantly.
              </p>
            </div>
            <Badge tone="teal">Mock Trading UI</Badge>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[320px_1fr]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/55 p-5">
              <div className="text-xs font-medium text-white/60">Controls</div>

              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm text-white/80">
                  Ticker
                  <select
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value as Ticker)}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/85 outline-none ring-0 focus:border-white/20"
                  >
                    {(["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"] as const).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-white/80">
                  Timeframe
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/85 outline-none focus:border-white/20"
                  >
                    {(["1D", "1W", "1M", "3M"] as const).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-white/80">
                  Stop-loss threshold
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Low</span>
                      <span className="font-semibold text-white/85">{stopLoss}%</span>
                      <span>High</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={25}
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="mt-3 w-full accent-teal-300"
                    />
                  </div>
                </label>

                <label className="grid gap-2 text-sm text-white/80">
                  Investment duration
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as Duration)}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/85 outline-none focus:border-white/20"
                  >
                    {(["1W", "1M", "3M", "1Y"] as const).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-5">
              <DashboardChart series={series} trend={trend} />

              <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/55 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-white/60">Prediction Output</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-white">
                        Expected Trend:{" "}
                        <span className={trend === "Bullish" ? "text-teal-300" : "text-rose-300"}>
                          {trend} {trend === "Bullish" ? "📈" : "📉"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-white/55">Confidence Score</span>
                    <span className="font-heading text-2xl font-semibold text-white">
                      {Math.round(confidence)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
                    <div className="text-[11px] text-white/55">EMA overlay</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">Enabled</div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
                    <div className="text-[11px] text-white/55">Stop-loss</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{stopLoss}%</div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
                    <div className="text-[11px] text-white/55">Duration</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{duration}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Tech stack
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70 md:text-base">
              Clean integrations across UI, data fetching, and ML inference.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {[
            "Next.js",
            "Python",
            "TensorFlow / Scikit-learn",
            "Yahoo Finance API",
            "Chart.js / Recharts",
            "Framer Motion",
          ].map((t) => (
            <motion.span
              key={t}
              className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-white/80 backdrop-blur"
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
              }}
            >
              {t}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Architecture + Impact */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <ArchitectureFlow />
          <ImpactList />
        </div>
      </div>
    </section>
  );
}
