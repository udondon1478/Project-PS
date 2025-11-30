import { useState, useEffect, useRef } from 'react';

interface UseTypewriterProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

export const useTypewriter = ({
  texts,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
}: UseTypewriterProps) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeedState, setTypingSpeedState] = useState(typingSpeed);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer when dependencies change or on cleanup
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (texts.length === 0) {
      if (displayText !== '') {
        setDisplayText('');
      }
      return;
    }

    const i = loopNum % texts.length;
    const fullText = texts[i];

    const handleTyping = () => {
      if (!isDeleting && displayText === fullText) {
        timerRef.current = setTimeout(() => {
          setIsDeleting(true);
          setTypingSpeedState(deletingSpeed);
        }, pauseDuration);
        return;
      }

      if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
        setTypingSpeedState(typingSpeed);
        return;
      }

      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      setTypingSpeedState(isDeleting ? deletingSpeed : typingSpeed);
    };

    timerRef.current = setTimeout(handleTyping, typingSpeedState);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [displayText, isDeleting, loopNum, texts, typingSpeed, deletingSpeed, pauseDuration, typingSpeedState]);

  return displayText;
};
