import { Easing } from "remotion";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const colors = {
  black: "#070708",
  ink: "#EDE7DD", // warm off-white
  dim: "rgba(237, 231, 221, 0.38)",
  faint: "rgba(237, 231, 221, 0.14)",
  gold: "#C9A46B",
};

export const fonts = {
  serif: "Instrument Serif",
  mono: "DM Mono",
};

loadFont({ family: fonts.serif, url: staticFile("fonts/InstrumentSerif-Regular.ttf"), weight: "400" });
loadFont({ family: fonts.serif, url: staticFile("fonts/InstrumentSerif-Italic.ttf"), weight: "400", style: "italic" });
loadFont({ family: fonts.mono, url: staticFile("fonts/DMMono-Regular.ttf"), weight: "400" });

// Motion language: one decisive curve for entrances, one symmetric curve for moves.
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Safe area for 1920x1080
export const SAFE_X = 160;
