import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3SocialTagging } from "./scenes/Scene3SocialTagging";
import { Scene4Tagging } from "./scenes/Scene4Tagging";
import { Scene5CTA } from "./scenes/Scene5CTA";
import { AudioLayer } from "./components/AudioLayer";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={600}>
          <Scene1Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={540}>
          <Scene2Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={540}>
          <Scene3SocialTagging />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({
            config: { damping: 20, stiffness: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={1460}>
          <Scene4Tagging />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-top" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 60,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={360}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <AudioLayer />
    </AbsoluteFill>
  );
};
