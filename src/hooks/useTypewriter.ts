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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  useEffect(() => {
    // Cleanup function to clear timer
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (texts.length === 0) {
      setDisplayText('');
      return;
    }

    const tick = () => {
      const i = loopNumRef.current % textsRef.current.length;
      const fullText = textsRef.current[i];
      const currentText = displayText; // This will be stale in closure, but we don't use it directly for logic if we track length or use functional update?
      // Actually, we can't easily use functional update for everything if we need to know current length to decide next step.
      // But we can track the current text length or just use the functional update pattern carefully.
      
      // Better approach: Since we want to avoid re-running the effect on every text change,
      // we need a recursive timeout that doesn't depend on `displayText` in the dependency array.
      // But `tick` needs to know the current state.
      
      // Let's use a mutable ref for the current display text as well, solely for the logic inside tick?
      // No, `setDisplayText` functional update is better.
      // But we need to know if we are finished typing or deleting.
      
      setDisplayText((prev) => {
        const isDeleting = isDeletingRef.current;
        
        if (isDeleting) {
          // Deleting logic
          if (prev === '') {
            isDeletingRef.current = false;
            loopNumRef.current += 1;
            // Schedule next tick immediately (or with small delay) to start typing next word
            // But we need to return the new state.
            // If we return '', no re-render if it was already '', but here it was ''
            // So we need to trigger the next step.
            
            // Wait! If prev is '', we are done deleting.
            // We should have handled this BEFORE this tick?
            // Or handle it now.
            
            // If we are here, it means we were deleting and reached empty string.
            // But the previous tick would have produced 'H' -> ''.
            // So this tick sees ''.
            
            // Let's restructure:
            // The tick function runs. It checks the CURRENT state (via refs or functional update args).
            
            // Issue: We need to schedule the NEXT tick based on the result of THIS tick.
            // But `setDisplayText` is async/batched.
            
            // Alternative: Keep all logic in `useEffect` but use `useRef` for the "current text" so we can read it synchronously?
            // Or just rely on the fact that we know what we just did.
            
            return prev; // Should not happen if logic is correct
          }
          
          const nextText = prev.substring(0, prev.length - 1);
          if (nextText === '') {
             // We just finished deleting.
             isDeletingRef.current = false;
             loopNumRef.current += 1;
             // Next tick should be typing speed
             timerRef.current = setTimeout(tick, typingSpeedRef.current);
          } else {
             // Continue deleting
             timerRef.current = setTimeout(tick, deletingSpeedRef.current);
          }
          return nextText;
        } else {
          // Typing logic
          if (prev === fullText) {
             // Finished typing.
             isDeletingRef.current = true;
             // Pause before deleting
             timerRef.current = setTimeout(tick, pauseDurationRef.current);
             return prev;
          }
          
          const nextText = fullText.substring(0, prev.length + 1);
          if (nextText === fullText) {
            // We just finished typing.
            // Next tick should be pause
            timerRef.current = setTimeout(tick, pauseDurationRef.current);
            // Note: We need to set isDeleting=true for the NEXT tick to handle.
            // But wait, if we set isDeleting=true here, the next tick will start deleting.
            // Correct.
            isDeletingRef.current = true;
          } else {
            // Continue typing
            timerRef.current = setTimeout(tick, typingSpeedRef.current);
          }
          return nextText;
        }
      });
    };

    // Start the loop
    // We need to handle the initial start carefully.
    // If we just call tick(), it will try to update state.
    // But we need to verify the logic inside tick matches the initial state.
    
    // Let's refine the tick logic to be more robust.
    // We can't easily access `prev` inside `setDisplayText` AND schedule the timeout based on it
    // because `setDisplayText` doesn't return the new value to us outside.
    
    // So we should maintain a `currentTextRef` that mirrors `displayText`.
    
    const runLoop = () => {
      const i = loopNumRef.current % textsRef.current.length;
      const fullText = textsRef.current[i];
      const isDeleting = isDeletingRef.current;
      const currentText = currentTextRef.current;
      

      
      let nextText = currentText;
      let nextDelay = typingSpeedRef.current;
      let shouldUpdateState = true;

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

      if (shouldUpdateState) {
        currentTextRef.current = nextText;
        setDisplayText(nextText);
      }
      
      timerRef.current = setTimeout(runLoop, nextDelay);
    };

    // Initialize currentTextRef
    currentTextRef.current = '';
    
    // Start immediately
    timerRef.current = setTimeout(runLoop, typingSpeedRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // Empty dependency array!

  // We need a ref to track the current text synchronously
  const currentTextRef = useRef('');

  return displayText;
};

