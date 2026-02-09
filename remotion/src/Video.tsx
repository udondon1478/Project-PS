import { AbsoluteFill, Sequence } from "remotion";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3SocialTagging } from "./scenes/Scene3SocialTagging";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={540}>
        <Scene1Problem />
      </Sequence>
      <Sequence from={540} durationInFrames={150}>
        <Scene2Solution />
      </Sequence>
      <Sequence from={690} durationInFrames={900}>
        <Scene3SocialTagging />
      </Sequence>
    </AbsoluteFill>
  );
};
