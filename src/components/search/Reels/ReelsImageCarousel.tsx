"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

interface ReelsImageCarouselProps {
  images: string[];
  title: string;
}

export function ReelsImageCarousel({ images, title }: ReelsImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    dragFree: false,
    containScroll: 'keepSnaps',
    skipSnaps: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <span className="text-muted-foreground">No Image</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={images[0]}
          alt={title}
          fill
          className="object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative h-full w-full flex-shrink-0">
              <Image
                src={imageUrl}
                alt={`${title} - ${index + 1}`}
                fill
                className="object-contain"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((_, index) => (
          <button
            key={index}
            className={`h-2 w-2 rounded-full transition-colors ${
              index === currentIndex
                ? 'bg-primary'
                : 'bg-primary/30'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`画像${index + 1}へ移動`}
          />
        ))}
      </div>
    </div>
  );
}
