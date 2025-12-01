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
  
  // Use refs for state that doesn't need to trigger re-renders directly
  // or is used inside the effect closure
  const isDeletingRef = useRef(false);
  const loopNumRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // We need a ref to track the current text synchronously
  const currentTextRef = useRef('');
  
  // Keep latest props in refs to access them inside the effect without adding dependencies
  const textsRef = useRef(texts);
  const typingSpeedRef = useRef(typingSpeed);
  const deletingSpeedRef = useRef(deletingSpeed);
  const pauseDurationRef = useRef(pauseDuration);

  // Update refs when props change
  useEffect(() => {
    textsRef.current = texts;
    typingSpeedRef.current = typingSpeed;
    deletingSpeedRef.current = deletingSpeed;
    pauseDurationRef.current = pauseDuration;
  }, [texts, typingSpeed, deletingSpeed, pauseDuration]);

  // Track changes to texts content without triggering re-renders on every render
  const [version, setVersion] = useState(0);
  const prevTextsStringRef = useRef<string | null>(null);

  // Lazy initialization of the ref
  if (prevTextsStringRef.current === null) {
    prevTextsStringRef.current = JSON.stringify(texts);
  }

  // Check for content changes
  useEffect(() => {
    const currentString = JSON.stringify(texts);
    if (currentString !== prevTextsStringRef.current) {
      prevTextsStringRef.current = currentString;
      setVersion((v) => v + 1);
    }
  }, [texts]);

  useEffect(() => {
    if (textsRef.current.length === 0) {
      setDisplayText('');
      return;
    }

    const runLoop = () => {
      if (textsRef.current.length === 0) {
        setDisplayText('');
        currentTextRef.current = '';
        return;
      }
      const i = loopNumRef.current % textsRef.current.length;
      const fullText = textsRef.current[i];
      const isDeleting = isDeletingRef.current;
      const currentText = currentTextRef.current;
      
      let nextText = currentText;
      let nextDelay = typingSpeedRef.current;

      if (isDeleting) {
        nextText = currentText.substring(0, currentText.length - 1);
        nextDelay = deletingSpeedRef.current;
        
        if (nextText === '') {
          isDeletingRef.current = false;
          loopNumRef.current += 1;
          nextDelay = typingSpeedRef.current; 
        }
      } else {
        nextText = fullText.substring(0, currentText.length + 1);
        nextDelay = typingSpeedRef.current;

        if (nextText === fullText) {
          isDeletingRef.current = true;
          nextDelay = pauseDurationRef.current;
        }
      }

      currentTextRef.current = nextText;
      setDisplayText(nextText);
      
      timerRef.current = setTimeout(runLoop, nextDelay);
    };

    // Clear any existing timer before starting a new one
    if (timerRef.current) clearTimeout(timerRef.current);

    // Initialize currentTextRef
    currentTextRef.current = '';
    isDeletingRef.current = false;
    loopNumRef.current = 0;
    
    // Start immediately
    timerRef.current = setTimeout(runLoop, typingSpeedRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [version]);



  return displayText;
};

