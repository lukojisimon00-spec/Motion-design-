import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { RevealLine } from "../components/RevealLine";
import { clamp, colors, easeInOut, easeOut, fonts, SAFE_X } from "../theme";
import timing from "../timing.json";
import { GROUND_Y } from "./SceneBuild";

const LINE_Y = 692;

/** Scene 4 (14–20 s): everything reduces to one line, then the call to act. */
export const SceneFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = timing.scenes.final.duration;
  const A = timing.text.finalA;
  const B = timing.text.finalB;

  // the ground line of scene 3 contracts into a short gold rule
  const m = interpolate(frame, [0, 44], [0, 1], { ...clamp, easing: easeInOut });
  const half = interpolate(m, [0, 1], [(1760 - SAFE_X) / 2, 60]);
  const y = interpolate(m, [0, 1], [GROUND_Y, LINE_Y]);
  const lineColor = m > 0.5 ? colors.gold : colors.ink;

  // CONSTRUIS. lands: tracking closes, blur clears, slight settle in scale
  const land = interpolate(frame, [B, B + 30], [0, 1], { ...clamp, easing: easeOut });
  const outro = interpolate(frame, [dur - 16, dur], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity: outro }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={960 - half}
          x2={960 + half}
          y1={y}
          y2={y}
          stroke={lineColor}
          strokeOpacity={interpolate(m, [0, 0.5, 1], [0.5, 0.35, 1])}
          strokeWidth={interpolate(m, [0, 1], [1.5, 2.5])}
        />
      </svg>

      <AbsoluteFill style={{ alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            top: 318,
            opacity: interpolate(frame, [B - 4, B + 20], [1, 0.5], clamp),
          }}
        >
          <RevealLine text="NE PERDS PAS TON TEMPS." start={A} size={92} tracking="0.04em" />
        </div>
        <div
          style={{
            position: "absolute",
            top: 430,
            fontFamily: fonts.serif,
            fontSize: 236,
            lineHeight: 1,
            color: colors.ink,
            whiteSpace: "nowrap",
            letterSpacing: `${interpolate(land, [0, 1], [0.32, 0.015])}em`,
            opacity: interpolate(frame, [B, B + 10], [0, 1], clamp),
            filter: `blur(${interpolate(land, [0, 1], [14, 0])}px)`,
            scale: interpolate(frame, [B, B + 40, dur], [1.06, 1, 0.985], { ...clamp, easing: easeOut }),
          }}
        >
          CONSTRUIS<span style={{ color: colors.gold }}>.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
