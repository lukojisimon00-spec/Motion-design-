import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, colors, easeOut, fonts } from "../theme";

/**
 * A line of type revealed word by word from behind a mask.
 * `start` is in frames, local to the parent sequence.
 */
export const RevealLine: React.FC<{
  text: string;
  start: number;
  size: number;
  color?: string;
  stagger?: number;
  duration?: number;
  tracking?: string;
  style?: React.CSSProperties;
}> = ({ text, start, size, color = colors.ink, stagger = 4, duration = 26, tracking = "0.01em", style }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: fonts.serif,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: tracking,
        color,
        whiteSpace: "nowrap",
        display: "flex",
        gap: `0 ${size * 0.24}px`,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const s = start + i * stagger;
        return (
          // generous vertical padding so accents (È, É) are not clipped by the mask
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: `${size * 0.14}px 0 ${size * 0.06}px`, margin: `-${size * 0.14}px 0 -${size * 0.06}px` }}>
            <span
              style={{
                display: "inline-block",
                translate: `0 ${interpolate(frame, [s, s + duration], [108, 0], { ...clamp, easing: easeOut })}%`,
                opacity: interpolate(frame, [s, s + duration * 0.5], [0, 1], clamp),
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};
