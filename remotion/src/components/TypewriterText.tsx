import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TypewriterTextProps {
  text: string;
  startFrame: number;
  charactersPerSecond?: number;
  style?: React.CSSProperties;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  charactersPerSecond = 5,
  style,
}) => {
  const frame = useCurrentFrame();
  const fps = 60;
  const framesPerCharacter = fps / charactersPerSecond;

  const elapsedFrames = Math.max(0, frame - startFrame);
  const charactersToShow = Math.floor(elapsedFrames / framesPerCharacter);
  const displayText = text.slice(0, Math.min(charactersToShow, text.length));

  const showCursor = frame >= startFrame && charactersToShow <= text.length;
  const cursorOpacity = Math.sin(frame * 0.15) > 0 ? 1 : 0;

  return (
    <span style={style}>
      {displayText}
      {showCursor && (
        <span style={{ opacity: cursorOpacity }}>|</span>
      )}
    </span>
  );
};
