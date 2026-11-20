import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { RevealLine } from "../components/RevealLine";
import { clamp, colors, easeIn, easeInOut, easeOut, SAFE_X } from "../theme";
import timing from "../timing.json";

const CX = 1390;
const CY = 540;
const R = 318;

/** Scene 1 (0–4 s): a dial draws itself in the dark; a gold arc sweeps one full turn. */
export const SceneClock: React.FC = () => {
  const frame = useCurrentFrame();
  const t = timing.text.clock;
  const dur = timing.scenes.clock.duration;

  // one full turn of the second hand, time-lapse
  const sweep = interpolate(frame, [8, 116], [0, 360], { ...clamp, easing: easeInOut });
  const circumference = 2 * Math.PI * R;

  // exit: the camera dives into the dial centre (continues into scene 2)
  const dive = interpolate(frame, [104, dur], [1, 3.2], { ...clamp, easing: easeIn });
  const exitFade = interpolate(frame, [108, dur], [1, 0], clamp);

  return (
    <AbsoluteFill>
      {/* slow push-in on the whole frame */}
      <AbsoluteFill
        style={{
          scale: interpolate(frame, [0, dur], [1, 1.06], clamp),
          transformOrigin: `${CX}px ${CY}px`,
        }}
      >
        <AbsoluteFill style={{ scale: dive, transformOrigin: `${CX}px ${CY}px`, opacity: exitFade }}>
          <svg width={1920} height={1080}>
            {/* outer ring draws in */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={colors.ink}
              strokeOpacity={0.42}
              strokeWidth={1.5}
              strokeDasharray={circumference}
              strokeDashoffset={interpolate(frame, [0, 42], [circumference, 0], { ...clamp, easing: easeInOut })}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
            <circle cx={CX} cy={CY} r={R - 46} fill="none" stroke={colors.ink} strokeOpacity={interpolate(frame, [20, 50], [0, 0.1], clamp)} strokeWidth={1} />
            {/* sixty minute marks fade in clockwise */}
            {new Array(60).fill(0).map((_, i) => {
              const hour = i % 5 === 0;
              const a = (i / 60) * Math.PI * 2;
              const r0 = R - (hour ? 30 : 16);
              const r1 = R - 6;
              const appear = 10 + i * 0.55;
              const passed = (i / 60) * 360 <= sweep;
              return (
                <line
                  key={i}
                  x1={CX + Math.sin(a) * r0}
                  y1={CY - Math.cos(a) * r0}
                  x2={CX + Math.sin(a) * r1}
                  y2={CY - Math.cos(a) * r1}
                  stroke={passed && frame > 8 ? colors.gold : colors.ink}
                  strokeOpacity={interpolate(frame, [appear, appear + 10], [0, hour ? 0.85 : 0.35], clamp)}
                  strokeWidth={hour ? 2.2 : 1.2}
                />
              );
            })}
            {/* elapsed time: gold arc trailing the hand */}
            <circle
              cx={CX}
              cy={CY}
              r={R + 22}
              fill="none"
              stroke={colors.gold}
              strokeWidth={2}
              strokeDasharray={`${(sweep / 360) * 2 * Math.PI * (R + 22)} ${2 * Math.PI * (R + 22)}`}
              transform={`rotate(-90 ${CX} ${CY})`}
              strokeLinecap="round"
              opacity={interpolate(frame, [8, 20], [0, 0.9], clamp)}
            />
            {/* hands */}
            <g opacity={interpolate(frame, [26, 44], [0, 1], clamp)}>
              <line x1={CX} y1={CY} x2={CX} y2={CY - R * 0.48} stroke={colors.ink} strokeWidth={5} strokeLinecap="round" transform={`rotate(${300 + sweep / 12} ${CX} ${CY})`} />
              <line x1={CX} y1={CY} x2={CX} y2={CY - R * 0.74} stroke={colors.ink} strokeWidth={3} strokeLinecap="round" transform={`rotate(${55 + sweep / 2} ${CX} ${CY})`} />
              <line x1={CX} y1={CY + 34} x2={CX} y2={CY - R + 22} stroke={colors.gold} strokeWidth={1.6} transform={`rotate(${sweep} ${CX} ${CY})`} />
              <circle cx={CX} cy={CY} r={7} fill={colors.gold} />
            </g>
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* headline */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: SAFE_X,
          opacity: interpolate(frame, [104, 122], [1, 0], clamp),
          translate: `0 ${interpolate(frame, [104, 124], [0, -24], { ...clamp, easing: easeIn })}px`,
        }}
      >
        <RevealLine text="TU POSSÈDES" start={t} size={134} />
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <RevealLine text="UNE RICHESSE" start={t + 12} size={134} />
          {/* the ellipsis lands dot by dot, like seconds */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                fontFamily: "Instrument Serif",
                fontSize: 134,
                color: colors.gold,
                opacity: interpolate(frame, [t + 34 + i * 9, t + 38 + i * 9], [0, 1], clamp),
                translate: `0 ${interpolate(frame, [t + 34 + i * 9, t + 44 + i * 9], [-10, 0], { ...clamp, easing: easeOut })}px`,
              }}
            >
              .
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
