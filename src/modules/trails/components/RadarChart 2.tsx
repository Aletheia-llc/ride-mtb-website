"use client";

import { useMemo } from "react";

interface RadarChartProps {
  trails: Array<{
    name: string;
    data: Record<string, number>; // axis → value (0–5)
    color: string;
  }>;
  axes: string[];
  size?: number;
}

function getPoint(center: number, angle: number, r: number) {
  return {
    x: center + r * Math.sin(angle),
    y: center - r * Math.cos(angle),
  };
}

export function RadarChart({ trails, axes, size = 200 }: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.75;
  const levels = 5;

  const angleStep = (2 * Math.PI) / axes.length;

  const gridLines = useMemo(() => {
    return Array.from({ length: levels }, (_, i) => {
      const r = (radius / levels) * (i + 1);
      return axes.map((_, j) => {
        const { x, y } = getPoint(center, j * angleStep, r);
        return `${j === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + " Z";
    });
  }, [axes, center, radius, levels, angleStep]);

  const trailPaths = useMemo(() => {
    return trails.map((trail) => {
      const path = axes.map((axis, i) => {
        const value = trail.data[axis] ?? 0;
        const r = (value / 5) * radius;
        const { x, y } = getPoint(center, i * angleStep, r);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + " Z";
      return { path, color: trail.color, name: trail.name };
    });
  }, [trails, axes, radius, center, angleStep]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid lines */}
      {gridLines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {axes.map((axis, i) => {
        const { x, y } = getPoint(center, i * angleStep, radius);
        return (
          <g key={axis}>
            <line
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={getPoint(center, i * angleStep, radius * 1.15).x}
              y={getPoint(center, i * angleStep, radius * 1.15).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {axis}
            </text>
          </g>
        );
      })}
      {/* Trail data */}
      {trailPaths.map(({ path, color, name }) => (
        <path
          key={name}
          d={path}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
