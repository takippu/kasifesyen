"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

type ImageDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
};

export function ImageDialog({ isOpen, onClose, imageSrc, imageAlt }: ImageDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle escape key press to close the dialog
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      setIsVisible(true);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent scrolling when dialog is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        className="relative max-w-full max-h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1920}
          height={1080}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          priority
        />
      </div>
    </div>
  );
}