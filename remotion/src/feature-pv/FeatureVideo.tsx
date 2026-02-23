import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneCause } from "./scenes/SceneCause";
import { SceneSolution } from "./scenes/SceneSolution";
import { SceneCTA } from "./scenes/SceneCTA";
import { FeatureAudioLayer } from "./FeatureAudioLayer";
import { FeatureSubtitleOverlay } from "./FeatureSubtitleOverlay";
import { FEATURE_TIMING, SPRING_CONFIGS } from "./featureConstants";

export const FeatureVideo: React.FC = () => {
  const { transitionFrames } = FEATURE_TIMING;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* S1: Problem (510f) */}
        <TransitionSeries.Sequence
          durationInFrames={FEATURE_TIMING.sceneProblem}
        >
          <SceneProblem />
        </TransitionSeries.Sequence>

        {/* S1→S2: fade 30f */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            config: SPRING_CONFIGS.smooth,
            durationInFrames: transitionFrames,
          })}
        />

        {/* S2: Cause (390f) */}
        <TransitionSeries.Sequence
          durationInFrames={FEATURE_TIMING.sceneCause}
        >
          <SceneCause />
        </TransitionSeries.Sequence>

        {/* S2→S3: wipe from-right 30f */}
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({
            config: SPRING_CONFIGS.smooth,
            durationInFrames: transitionFrames,
          })}
        />

        {/* S3: Solution (630f) */}
        <TransitionSeries.Sequence
          durationInFrames={FEATURE_TIMING.sceneSolution}
        >
          <SceneSolution />
        </TransitionSeries.Sequence>

        {/* S3→S4: slide from-bottom 30f */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({
            config: SPRING_CONFIGS.snappy,
            durationInFrames: transitionFrames,
          })}
        />

        {/* S4: CTA (360f) */}
        <TransitionSeries.Sequence
          durationInFrames={FEATURE_TIMING.sceneCTA}
        >
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <FeatureSubtitleOverlay />
      <FeatureAudioLayer />
    </AbsoluteFill>
  );
};
