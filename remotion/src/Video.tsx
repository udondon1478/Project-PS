import { AbsoluteFill, Sequence } from "remotion";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3SocialTagging } from "./scenes/Scene3SocialTagging";
import { Scene4Tagging } from "./scenes/Scene4Tagging";
import { Scene5CTA } from "./scenes/Scene5CTA";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={540}>
        <Scene1Problem />
      </Sequence>
      <Sequence from={540} durationInFrames={150}>
        <Scene2Solution />
      </Sequence>
      <Sequence from={690} durationInFrames={300}>
        <Scene3SocialTagging />
      </Sequence>
      <Sequence from={990} durationInFrames={700}>
        <Scene4Tagging />
      </Sequence>
      {/* Scene4の終わり(1690f)に30f被せてスライドイン */}
      <Sequence from={1660} durationInFrames={210}>
        <Scene5CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
