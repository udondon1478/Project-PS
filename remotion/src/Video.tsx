import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3SocialTagging } from "./scenes/Scene3SocialTagging";
import { Scene4Tagging } from "./scenes/Scene4Tagging";
import { Scene5CTA } from "./scenes/Scene5CTA";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={1080}>
          <Scene1Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 60 })}
        />

        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene2Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={600}>
          <Scene3SocialTagging />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={1400}>
          <Scene4Tagging />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({
            config: { damping: 200, stiffness: 100 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={420}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
