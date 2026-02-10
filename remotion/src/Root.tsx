import { Composition } from "remotion";
import { Video } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PolySeekPromo"
        component={Video}
        durationInFrames={3720}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
