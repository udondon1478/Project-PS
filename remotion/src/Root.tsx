import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { FeatureVideo } from "./feature-pv/FeatureVideo";
import { FEATURE_TIMING } from "./feature-pv/featureConstants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PolySeekPromo"
        component={Video}
        durationInFrames={3300}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureTagAlias"
        component={FeatureVideo}
        durationInFrames={FEATURE_TIMING.totalFrames}
        fps={FEATURE_TIMING.fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
