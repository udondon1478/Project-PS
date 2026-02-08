import { AbsoluteFill } from "remotion";
import { Scene1Problem } from "./scenes/Scene1Problem";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Scene1Problem />
    </AbsoluteFill>
  );
};
