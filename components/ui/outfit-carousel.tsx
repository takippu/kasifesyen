"use client";

import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageDialog } from './image-dialog';

type OutfitCarouselProps = {
  outfits: any[];
};

export function OutfitCarousel({ outfits }: OutfitCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (!outfits || outfits.length === 0) return null;

  return (
    <div className="relative">
      {selectedImage && (
        <ImageDialog 
          isOpen={dialogOpen} 
          onClose={() => setDialogOpen(false)} 
          imageSrc={selectedImage.src} 
          imageAlt={selectedImage.alt} 
        />
      )}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {outfits.map((outfit, index) => (
            <div 
              key={index} 
              className="flex-[0_0_100%] min-w-0 pl-4 relative"
            >
              <div className="p-4 bg-pink-50/50 dark:bg-purple-950/50 rounded-lg h-full">
                <div className="flex flex-col md:flex-row gap-6">
                  {outfit.generatedImage && (
                    <div className="flex-shrink-0">
                      <div 
                        className="relative w-full md:w-48 h-48 rounded-lg overflow-hidden border-2 border-pink-200 dark:border-purple-700 cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => {
                          setSelectedImage({
                            src: outfit.generatedImage,
                            alt: `${outfit.name} outfit`
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <img 
                          src={outfit.generatedImage} 
                          alt={`${outfit.name} outfit`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-grow">
                    <h4 className="font-medium text-pink-600 dark:text-pink-400 mb-3">
                      {outfit.name}
                    </h4>
                    <div className="space-y-2">
                      {outfit.pieces && (
                        <p>
                          <span className="font-medium">Pieces: </span>
                          {outfit.pieces.join(", ")}
                        </p>
                      )}
                      {outfit.occasions && (
                        <p>
                          <span className="font-medium">Occasions: </span>
                          {outfit.occasions.join(", ")}
                        </p>
                      )}
                      {outfit.reasoning && (
                        <p>
                          <span className="font-medium">Why it works: </span>
                          {outfit.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <button
        className={`absolute top-1/2 left-0 transform -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 p-2 rounded-full shadow-md ${!prevBtnEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-100 dark:hover:bg-purple-900'}`}
        onClick={scrollPrev}
        disabled={!prevBtnEnabled}
        aria-label="Previous outfit"
      >
        <ChevronLeft className="h-6 w-6 text-pink-600 dark:text-pink-300" />
      </button>

      <button
        className={`absolute top-1/2 right-0 transform -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 p-2 rounded-full shadow-md ${!nextBtnEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-100 dark:hover:bg-purple-900'}`}
        onClick={scrollNext}
        disabled={!nextBtnEnabled}
        aria-label="Next outfit"
      >
        <ChevronRight className="h-6 w-6 text-pink-600 dark:text-pink-300" />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {outfits.map((_, index) => (
          <button
            key={index}
            className={`h-2 w-2 rounded-full ${index === selectedIndex ? 'bg-pink-500 dark:bg-pink-400' : 'bg-pink-200 dark:bg-purple-700'}`}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to outfit ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}