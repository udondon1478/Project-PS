import { Composition } from "remotion";
import { Video } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PolySeekPromo"
        component={Video}
        durationInFrames={332}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
