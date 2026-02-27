"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Customized,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { type ObstacleChartState } from "@/lib/pong/gameState";
import { generateWaveData } from "@/lib/pong/waveFunction";
import { DISPLAY_K_SCALE } from "@/lib/pong/quantumConstant";

interface Props {
  obstacle: ObstacleChartState;
  canvasWidth: number;
  animFrame: number;
  label: string;
}

const chartConfig: ChartConfig = {
  psiReal: {
    label: "Re(\u03C8)",
    color: "hsl(220, 90%, 60%)",
  },
  potential: {
    label: "V(x)",
    color: "hsl(0, 90%, 60%)",
  },
};

const COLLISION_FADE_FRAMES = 90;

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const SERIF_FONT =
  "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartOverlay(props: any) {
  const xAxis =
    props.xAxisMap &&
    (Object.values(props.xAxisMap)[0] as
      | { x: number; y: number; width: number; height: number }
      | undefined);
  const yAxis =
    props.yAxisMap &&
    (Object.values(props.yAxisMap)[0] as
      | { x: number; y: number; width: number; height: number }
      | undefined);
  if (!xAxis || !yAxis) return null;

  const chartTop = yAxis.y;
  const chartLeft = xAxis.x;
  const chartRight = xAxis.x + xAxis.width;
  const chartBottom = yAxis.y + yAxis.height;
  const chartMidX = chartLeft + xAxis.width / 2;

  return (
    <g>
      {/* g·δ(x) annotation near barrier peak */}
      <text
        x={chartMidX + 16}
        y={chartTop + (chartBottom - chartTop) * 0.25}
        fill="rgba(255, 130, 130, 0.8)"
        fontSize={15}
        fontFamily={SERIF_FONT}
        fontStyle="italic"
        textAnchor="start"
      >
        {"g \u00B7 \u03B4(x)"}
      </text>

      {/* X-axis label */}
      <text
        x={chartMidX}
        y={chartBottom + 16}
        fill="rgba(255, 255, 255, 0.55)"
        fontSize={16}
        fontFamily={SERIF_FONT}
        fontStyle="italic"
        textAnchor="middle"
      >
        position (x)
      </text>

      {/* Y-axis label */}
      <text
        x={chartLeft - 16}
        y={chartTop + yAxis.height / 2}
        fill="rgba(255, 255, 255, 0.55)"
        fontSize={16}
        fontFamily={SERIF_FONT}
        fontStyle="italic"
        textAnchor="middle"
        transform={`rotate(-90, ${chartLeft - 16}, ${chartTop + yAxis.height / 2})`}
      >
        V(x)
      </text>
    </g>
  );
}

export function ObstacleWaveChart({
  obstacle,
  canvasWidth,
  animFrame,
  label,
}: Props) {
  const data = useMemo(() => {
    const omega = 0.08;
    const animPhase = animFrame * omega;

    const ddx = obstacle.ballX - obstacle.obstacleX;
    const ddy = obstacle.ballY - obstacle.obstacleY;
    const dist2D = Math.sqrt(ddx * ddx + ddy * ddy);
    const isApproaching =
      (obstacle.ballX < obstacle.obstacleX && obstacle.ballDirectionX > 0) ||
      (obstacle.ballX > obstacle.obstacleX && obstacle.ballDirectionX < 0);

    const cloudRadius = obstacle.ballSigma * 2.5;
    const cloudEdgeDist = dist2D - cloudRadius;
    const proximityThreshold = 50;
    const maxDist = canvasWidth * 0.4;

    const normalizedDist = Math.min(dist2D / maxDist, 1);

    // Direction based on current ball position (for incoming wave)
    const currentDirection: 1 | -1 =
      obstacle.ballX < obstacle.obstacleX ? 1 : -1;

    const cloudProximity = 1 - Math.max(0, cloudEdgeDist) / proximityThreshold;
    const incomingAmplitude =
      isApproaching && cloudProximity > 0 ? Math.min(1, cloudProximity) : 0;

    let transmittedAmplitude = 0;
    let reflectedAmplitude = 0;
    const hasPostCollision =
      obstacle.framesSinceCollision < COLLISION_FADE_FRAMES;
    if (hasPostCollision) {
      const fade = 1 - obstacle.framesSinceCollision / COLLISION_FADE_FRAMES;
      if (obstacle.collisionT > 0.5) {
        transmittedAmplitude = Math.sqrt(obstacle.collisionT) * fade;
      } else {
        reflectedAmplitude = Math.sqrt(1 - obstacle.collisionT) * fade;
      }
    }

    // Use collision direction for post-collision waves, current position otherwise
    const direction: 1 | -1 = hasPostCollision
      ? obstacle.collisionDirection
      : currentDirection;

    const ballChartX =
      direction === 1
        ? -5 - normalizedDist * 85 // negative range: far left → near barrier
        : 5 + normalizedDist * 85; // positive range: far right → near barrier

    const displayK = Math.max(
      0.08,
      Math.min(0.5, obstacle.waveNumber * DISPLAY_K_SCALE),
    );

    return generateWaveData(
      displayK,
      animPhase,
      ballChartX,
      obstacle.barrierStrength,
      incomingAmplitude,
      transmittedAmplitude,
      reflectedAmplitude,
      direction,
    );
  }, [
    obstacle.ballX,
    obstacle.ballY,
    obstacle.obstacleX,
    obstacle.obstacleY,
    obstacle.ballDirectionX,
    obstacle.ballSigma,
    obstacle.waveNumber,
    obstacle.barrierStrength,
    obstacle.collisionT,
    obstacle.collisionDirection,
    obstacle.framesSinceCollision,
    canvasWidth,
    animFrame,
  ]);

  return (
    <div className="flex-1 flex flex-col relative rounded-md overflow-hidden border border-white/8 bg-[#060a12]">
      {/* Top-edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-400/20 to-transparent" />

      {/* Header — centered title */}
      <div className="flex items-center justify-center py-1.5 border-b border-white/6">
        <span
          className="text-[14px] tracking-[0.12em] uppercase text-white/70 font-medium"
          style={{ fontFamily: MONO_FONT }}
        >
          {label}
        </span>
      </div>

      {/* Chart area — flex-1 fills remaining height */}
      <div className="relative flex-1 min-h-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto! h-full w-full"
        >
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 10, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(100, 160, 255, 0.35)" />
                <stop offset="50%" stopColor="rgba(100, 160, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(100, 160, 255, 0)" />
              </linearGradient>
              <linearGradient id="barrierGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 80, 80, 0.3)" />
                <stop offset="100%" stopColor="rgba(255, 80, 80, 0)" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(255, 255, 255, 0.04)"
              vertical={false}
            />

            {/* Axis labels + g·δ(x) annotation */}
            <Customized component={ChartOverlay} />

            <XAxis
              dataKey="x"
              tick={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              hide={false}
              domain={[-2.5, 2.5]}
              tick={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />

            {/* Barrier glow fill */}
            <Area
              dataKey="potential"
              type="monotone"
              fill="url(#barrierGlow)"
              stroke="none"
              isAnimationActive={false}
            />

            {/* Delta function barrier V(x) */}
            <Line
              dataKey="potential"
              type="monotone"
              stroke="rgba(255, 85, 85, 0.9)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Wave glow fill */}
            <Area
              dataKey="psiReal"
              type="monotone"
              fill="url(#waveGlow)"
              stroke="none"
              isAnimationActive={false}
            />

            {/* Wave function Re(ψ) */}
            <Line
              dataKey="psiReal"
              type="monotone"
              stroke="rgba(130, 180, 255, 1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>

        {/* T/R readout — bottom-right inside chart */}
        <div
          className="absolute bottom-2 right-3.5 flex flex-col items-end gap-0.5 pointer-events-none"
          style={{ fontFamily: MONO_FONT }}
        >
          <span className="text-[11px] tabular-nums text-emerald-400/70">
            T = {obstacle.transmissionCoeff.toFixed(4)}
          </span>
          <span className="text-[11px] tabular-nums text-red-400/60">
            R = {obstacle.reflectionCoeff.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
