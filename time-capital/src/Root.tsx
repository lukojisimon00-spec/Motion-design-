import React from "react";
import { Composition } from "remotion";
import { TimeCapital } from "./TimeCapital";
import timing from "./timing.json";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TimeCapital"
      component={TimeCapital}
      durationInFrames={timing.durationInFrames}
      fps={timing.fps}
      width={1920}
      height={1080}
    />
  );
};
