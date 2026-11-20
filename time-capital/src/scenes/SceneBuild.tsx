import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { RevealLine } from "../components/RevealLine";
import { clamp, colors, easeInOut, easeOut, SAFE_X } from "../theme";
import timing from "../timing.json";

export const GROUND_Y = 880;

// Line-art figure at a desk, in profile, facing the future (right).
const FIGURE: { d: string; at: number; w?: number }[] = [
  // chair
  { d: "M 452 752 L 548 752", at: 0 },
  { d: "M 462 752 C 456 700, 452 650, 446 606", at: 2 },
  { d: "M 470 752 L 460 880", at: 4 },
  { d: "M 540 752 L 552 880", at: 4 },
  // body
  { d: "M 548 610 C 546 616, 545 620, 544 624", at: 7, w: 2.4 },
  { d: "M 528 612 C 508 652, 506 712, 518 748", at: 8, w: 2.4 },
  { d: "M 560 616 C 580 646, 584 694, 572 742", at: 9, w: 2.4 },
  { d: "M 520 744 L 652 740", at: 12, w: 2.4 },
  { d: "M 652 740 L 662 872 L 708 874", at: 15, w: 2.4 },
  { d: "M 548 632 C 566 664, 576 690, 594 704 L 684 704", at: 14, w: 2.4 },
  // desk
  { d: "M 620 714 L 930 714", at: 6, w: 3 },
  { d: "M 640 714 L 640 880", at: 10 },
  { d: "M 910 714 L 910 880", at: 10 },
  // laptop
  { d: "M 664 708 L 790 708", at: 16, w: 2.4 },
  { d: "M 790 708 L 752 596", at: 18, w: 2.4 },
  // books stacked on the desk: learning
  { d: "M 832 708 L 900 708 L 896 690 L 828 690 L 832 708 M 840 690 L 844 674 L 890 674 L 888 690", at: 20 },
];

// Minutes, stacked into a rising structure.
const COLS = 15;
const CELL = 48;
const X0 = 1004;
const blocks: { x: number; y: number; k: number }[] = [];
for (let c = 0; c < COLS; c++) {
  const h = 1 + Math.floor(c * 0.66);
  for (let r = 0; r < h; r++) {
    blocks.push({ x: X0 + c * CELL, y: GROUND_Y - (r + 1) * CELL, k: blocks.length });
  }
}

/** Scene 3 (8–14 s): someone works and learns; every minute becomes a block of the future. */
export const SceneBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = timing.scenes.build.duration;
  const T = timing.text;

  const buildStart = 34;
  const buildEnd = 150;
  const per = (buildEnd - buildStart) / blocks.length;
  const exit = interpolate(frame, [154, 178], [1, 0], { ...clamp, easing: easeInOut });

  return (
    <AbsoluteFill>
      {/* camera: slow push and drift toward the structure */}
      <AbsoluteFill
        style={{
          opacity: exit,
          scale: interpolate(frame, [0, dur], [1.0, 1.07], clamp),
          translate: `${interpolate(frame, [0, dur], [36, -36], { ...clamp, easing: easeInOut })}px 0`,
          transformOrigin: "1100px 700px",
        }}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="screenGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={colors.gold} stopOpacity="0.45" />
              <stop offset="1" stopColor={colors.gold} stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* light from the screen onto the face */}
          <ellipse cx={700} cy={640} rx={190} ry={140} fill="url(#screenGlow)" opacity={interpolate(frame, [30, 60], [0, 1], clamp) * (0.85 + 0.15 * Math.sin(frame / 7))} />
          {/* head */}
          <circle
            cx={556}
            cy={586}
            r={25}
            fill="none"
            stroke={colors.ink}
            strokeWidth={2.4}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={interpolate(frame, [10, 34], [1, 0], { ...clamp, easing: easeInOut })}
          />
          {FIGURE.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={colors.ink}
              strokeOpacity={0.9}
              strokeWidth={p.w ?? 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={interpolate(frame, [p.at, p.at + 22], [1, 0], { ...clamp, easing: easeInOut })}
            />
          ))}
          {/* screen face, lit */}
          <path d="M 788 704 L 754 602" stroke={colors.gold} strokeWidth={5} strokeLinecap="round" opacity={interpolate(frame, [32, 46], [0, 1], clamp)} />

          {/* blocks */}
          {blocks.map((b) => {
            const at = buildStart + b.k * per;
            const p = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: easeOut });
            const age = frame - at;
            const fresh = interpolate(age, [0, 26], [1, 0], clamp);
            return (
              <rect
                key={b.k}
                x={b.x + 3}
                y={b.y + 3 + (1 - p) * 18}
                width={CELL - 6}
                height={CELL - 6}
                fill={colors.gold}
                fillOpacity={p * (0.14 + 0.7 * fresh)}
                stroke={fresh > 0.05 ? colors.gold : colors.ink}
                strokeOpacity={p * (0.35 + 0.5 * fresh)}
                strokeWidth={1.2}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ground: carried into the final scene */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={SAFE_X}
          x2={SAFE_X + (1760 - SAFE_X) * interpolate(frame, [0, 30], [0, 1], { ...clamp, easing: easeInOut })}
          y1={GROUND_Y}
          y2={GROUND_Y}
          stroke={colors.ink}
          strokeOpacity={0.5}
          strokeWidth={1.5}
        />
      </svg>

      {/* headline */}
      <div style={{ position: "absolute", left: SAFE_X, top: 140, opacity: exit }}>
        <RevealLine text="CHAQUE MINUTE INVESTIE" start={T.buildA} size={108} />
        <RevealLine text="PEUT CONSTRUIRE" start={T.buildB} size={108} />
        <RevealLine text="TON AVENIR." start={T.buildC} size={108} color={colors.gold} />
      </div>
    </AbsoluteFill>
  );
};
