import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { RevealLine } from "../components/RevealLine";
import { clamp, colors, easeIn, easeInOut, easeOut, fonts, SAFE_X } from "../theme";
import timing from "../timing.json";

const RIGHT = 1760;
const RULER_Y = 470;
const BAR_Y = 540;

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** Scene 2 (4–8 s): a day counts down, a timeline scrolls, a reserve drains. */
export const SceneFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = timing.scenes.flow.duration;

  // seconds left in the day, accelerating
  const elapsed = interpolate(frame, [4, dur], [0, 31000], { ...clamp, easing: easeIn });
  const left = 86400 - elapsed;
  const hh = pad(left / 3600 === 24 ? 24 : left / 3600);
  const mm = pad((left % 3600) / 60);
  const ss = pad(left % 60);

  const draw = interpolate(frame, [0, 26], [0, 1], { ...clamp, easing: easeInOut });
  const scroll = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: easeIn }) * 1400 + frame * 3;
  const reserve = interpolate(frame, [10, dur], [1, 0.36], { ...clamp, easing: easeInOut });
  const headX = SAFE_X + (RIGHT - SAFE_X) * reserve;

  const exit = interpolate(frame, [106, dur], [0, 1], { ...clamp, easing: easeIn });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - exit, translate: `${-140 * exit}px 0` }}>
        {/* counter */}
        <div
          style={{
            position: "absolute",
            left: SAFE_X - 4,
            top: 150,
            fontFamily: fonts.mono,
            fontSize: 120,
            letterSpacing: "-0.02em",
            color: colors.dim,
            fontVariantNumeric: "tabular-nums",
            opacity: interpolate(frame, [4, 22], [0, 1], clamp),
            filter: `blur(${interpolate(frame, [4, 22], [10, 0], clamp)}px)`,
          }}
        >
          {hh}
          <span style={{ opacity: 0.5 }}>:</span>
          {mm}
          <span style={{ opacity: 0.5 }}>:</span>
          {ss}
        </div>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <clipPath id="band">
              <rect x={SAFE_X} y={RULER_Y - 60} width={(RIGHT - SAFE_X) * draw} height={140} />
            </clipPath>
            <linearGradient id="fadeEdges" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.08" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.92" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="edges">
              <rect x={SAFE_X} y={0} width={RIGHT - SAFE_X} height={1080} fill="url(#fadeEdges)" />
            </mask>
          </defs>
          {/* scrolling timeline */}
          <g clipPath="url(#band)" mask="url(#edges)">
            {new Array(110).fill(0).map((_, i) => {
              const x = SAFE_X + ((i * 24 - scroll) % 2640 + 2640) % 2640;
              const major = i % 10 === 0;
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={RULER_Y - (major ? 34 : 14)} y2={RULER_Y} stroke={colors.ink} strokeOpacity={major ? 0.55 : 0.22} strokeWidth={major ? 1.6 : 1} />
                  {major && (
                    <text x={x + 8} y={RULER_Y - 22} fill={colors.ink} fillOpacity={0.4} fontFamily={fonts.mono} fontSize={20}>
                      {pad((i / 10) * 2 + 0)}:00
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={SAFE_X} x2={RIGHT} y1={RULER_Y} y2={RULER_Y} stroke={colors.ink} strokeOpacity={0.3} />
          </g>
          {/* reserve: what is left of the day, draining, never refilling */}
          <line x1={SAFE_X} x2={SAFE_X + (RIGHT - SAFE_X) * draw} y1={BAR_Y} y2={BAR_Y} stroke={colors.ink} strokeOpacity={0.12} strokeWidth={2} />
          <line x1={SAFE_X} x2={SAFE_X + (headX - SAFE_X) * draw} y1={BAR_Y} y2={BAR_Y} stroke={colors.gold} strokeWidth={4} />
          <g opacity={draw}>
            <line x1={headX} x2={headX} y1={RULER_Y - 52} y2={BAR_Y + 18} stroke={colors.gold} strokeWidth={1.5} />
            <circle cx={headX} cy={BAR_Y} r={6} fill={colors.gold} />
          </g>
        </svg>

        {/* headline */}
        <div style={{ position: "absolute", left: SAFE_X, top: 650 }}>
          <RevealLine text="QUE TU NE PEUX PAS" start={timing.text.flowA} size={134} />
          <RevealLine text="RECHARGER." start={timing.text.flowB} size={134} color={colors.gold} stagger={0} />
        </div>
      </AbsoluteFill>
      {/* arrival from the dial dive: a brief bloom of light */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 72% 50%, rgba(201,164,107,0.35), rgba(0,0,0,0) 45%)",
          opacity: interpolate(frame, [0, 14], [1, 0], { ...clamp, easing: easeOut }),
        }}
      />
    </AbsoluteFill>
  );
};
