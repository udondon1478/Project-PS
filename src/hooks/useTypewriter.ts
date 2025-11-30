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
        }, pauseDuration);
        return;
      }

      if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
        return;
      }

      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      const delay = isDeleting ? deletingSpeed : typingSpeed;
      timerRef.current = setTimeout(handleTyping, delay);
    };

    // Initial start
    const initialDelay = isDeleting ? deletingSpeed : typingSpeed;
    timerRef.current = setTimeout(handleTyping, initialDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [displayText, isDeleting, loopNum, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
};
