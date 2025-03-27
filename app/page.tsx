"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { OutfitCarousel } from "@/components/ui/outfit-carousel";
import { ImageDialog } from "@/components/ui/image-dialog";
import { VideoDialog } from "@/components/ui/video-dialog";
import { CameraView } from "@/components/ui/camera-view";
import { RefreshCw, PlayCircle, AlertCircle, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ItemDescription {
  [key: string]: string;
}

interface Outfit {
  name: string;
  pieces?: string[];
  occasions?: string[];
  reasoning?: string;
  generatedImage?: string;
}

interface FashionResult {
  itemType: string;
  itemDescription?: ItemDescription;
  outfits?: Outfit[];
  stylingTips?: string[];
  generatedImage?: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [textPrompt, setTextPrompt] = useState("");
  const [result, setResult] = useState<FashionResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'cat'>('female');
  const [halalMode, setHalalMode] = useState(false);
  const [halalInfoOpen, setHalalInfoOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextPrompt(e.target.value);
  };

  const toggleHalalMode = () => {
    const newMode = !halalMode;
    setHalalMode(newMode);
    if (newMode) {
      setHalalInfoOpen(true);
    }
  };

  const handleSubmit = async () => {
    setResult(null);
    setError(null);
    setIsLoading(true);
    setLoadingStage("Preparing your request...");

    try {
      if (!file && !textPrompt) {
        throw new Error("Please upload an image or provide a text description");
      }

      // Create a timeout to update loading messages periodically
      let loadingMessageIndex = 0;
      const loadingMessages = [
        "Preparing your request...",
        "Converting image for processing...",
        "Analyzing fashion elements...",
        "Identifying clothing style and features...",
        "Creating outfit combinations...",
        "Generating styling recommendations...",
        "Creating outfit visualizations...",
        "Finalizing your fashion suggestions..."
      ];
      
      // Set up a timer to cycle through loading messages
      const loadingTimer = setInterval(() => {
        loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
        setLoadingStage(loadingMessages[loadingMessageIndex]);
      }, 3000);

      const formData = new FormData();
      if (file) {
        formData.append("image", file);
      }
      if (textPrompt) formData.append("prompt", textPrompt);
      formData.append("gender", gender);
      formData.append("halalMode", String(halalMode));

      setLoadingStage("Sending request to AI fashion expert...");
      const response = await fetch("/api/fashion", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        clearInterval(loadingTimer);
        throw new Error(`Error: ${response.status}`);
      }

      setLoadingStage("Processing fashion recommendations...");
      const data = await response.json();

      if (data.rawResponse) {
        setLoadingStage("Formatting AI fashion advice...");
        try {
          const sanitized = data.rawResponse.replace(/```json/g, '').replace(/```/g, '');
          const parsedData = JSON.parse(sanitized) as FashionResult;
          setResult({
            ...parsedData,
            generatedImage: parsedData.generatedImage?.trimEnd()
          });
        } catch (error) {
          clearInterval(loadingTimer);
          setError(error instanceof Error ? error.message : "An unknown error occurred");

          throw new Error('Failed to parse fashion recommendations');
        }
      } else {
        setResult(data);
      }

      // Clear the loading timer when done
      clearInterval(loadingTimer);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
      setLoadingStage("");
    }
  };
  
  const handleReset = () => {
    setResult(null);
    setFile(null);
    setTextPrompt("");
    setPreview(null);
    setError(null);
    setShowForm(true);
  };

  const renderResults = () => {
    if (!result) return null;

    return (
      <div className="mt-4 sm:mt-8 space-y-6 sm:space-y-8">
        <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-lg border border-pink-100/50 dark:border-purple-900/50 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-pink-800 dark:text-pink-200">
            Fashion Recommendations
          </h2>
          
          <div className="space-y-6 sm:space-y-8">
            {/* Item Details */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-pink-700 dark:text-pink-300">
                {result.itemType}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="font-medium text-pink-600 dark:text-pink-400 mb-2 sm:mb-3">
                    Item Description
                  </h4>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {Object.entries(result.itemDescription || {}).map(([key, value]) => (
                      <li key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span>{value || 'Not specified'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {preview && (
                  <div className="flex justify-center items-center">
                    <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-lg overflow-hidden border-2 border-pink-200 dark:border-purple-700">
                      <Image 
                        src={preview} 
                        alt="Uploaded item" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

           {/* Outfit Suggestions */}
            {Array.isArray(result.outfits) && result.outfits.length > 0 && (
              <section>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-pink-700 dark:text-pink-300">
                  Outfit Suggestions
                </h3>
                <OutfitCarousel outfits={result.outfits} />
              </section>
            )}

            {/* Styling Tips */}
            {Array.isArray(result.stylingTips) && result.stylingTips.length > 0 && (
              <section>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-pink-700 dark:text-pink-300">
                  Styling Tips
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  {result.stylingTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* Generated Outfit Image */}
        {result.generatedImage && (
          <div className="flex flex-col items-center">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-pink-700 dark:text-pink-300">
              Generated Outfit
            </h3>
            <div 
              className="relative rounded-xl shadow-lg border-2 border-pink-200 dark:border-purple-700 w-full max-w-xs sm:max-w-sm h-64 sm:h-96 cursor-pointer transition-transform hover:scale-[1.02]"
              onClick={() => {
                setSelectedImage({
                  src: result.generatedImage!,
                  alt: "Generated outfit"
                });
                setDialogOpen(true);
              }}
            >
              <Image 
                src={result.generatedImage}
                alt="Generated outfit"
                fill
                className="object-cover rounded-lg"
              />
            </div>
          </div>
        )}
        
        {selectedImage && (
          <ImageDialog 
            isOpen={dialogOpen} 
            onClose={() => setDialogOpen(false)} 
            imageSrc={selectedImage.src} 
            imageAlt={selectedImage.alt} 
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col gap-4 sm:gap-8 p-4 sm:p-8 md:p-12 bg-gradient-to-b from-pink-50 to-white dark:from-purple-950 dark:to-gray-950 overflow-x-hidden">
      {showCamera && (
        <CameraView
          onCapture={(capturedFile) => {
            setFile(capturedFile);
            const objectUrl = URL.createObjectURL(capturedFile);
            setPreview(objectUrl);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <header className="text-center max-w-4xl mx-auto w-full mt-4 sm:mt-8">
        <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent px-4">
          KasiFesyen
        </h1>
        <p className="text-sm sm:text-lg text-pink-800/80 dark:text-pink-200/80 font-serif italic mb-4 px-4">
          Your AI-powered personal fashion stylist
        </p>
        <Button
          onClick={() => setVideoDialogOpen(true)}
          variant="ghost"
          className="mx-auto flex items-center gap-2 text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-purple-900/20"
        >
          <PlayCircle size={20} />
          <span>Watch Tutorial</span>
        </Button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4">
        {showForm ? (
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-xl border border-pink-100/50 dark:border-purple-900/50">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
              <div>
                <label className="block mb-3 text-sm font-medium text-pink-900 dark:text-pink-100">
                  Upload your outfit
                </label>
                <div 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="h-40 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:bg-pink-50/50 dark:hover:bg-purple-900/20 transition-all relative flex items-center justify-center"
                >
                  <input 
                    id="file-upload"
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                  {preview ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={preview} 
                        alt="Preview" 
                        fill 
                        className="object-contain p-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white text-pink-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                        }}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Image
                        src="/upload.svg"
                        alt="Upload icon"
                        width={28}
                        height={28}
                        className="mx-auto"
                      />
                      <p className="text-sm text-pink-600/80 dark:text-pink-300/80">
                        Click to upload or drag & drop
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2 text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-purple-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCamera(true);
                          }}
                        >
                          <Camera size={16} />
                          Use Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block mb-3 text-sm font-medium text-pink-900 dark:text-pink-100">
                  Describe your style
                </label>
                <textarea
                  className="w-full h-40 p-4 border border-pink-200 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 dark:bg-purple-950/50 dark:border-purple-800 placeholder:text-pink-400/70 dark:placeholder:text-pink-500/70"
                  placeholder="e.g., 'I have a blue shirt and black jeans, what should I wear?'"
                  value={textPrompt}
                  onChange={handleTextChange}
                />
              </div>
            </div>
            
            {/* Filters section */}
            <div className="mt-6 p-4 bg-pink-50/50 dark:bg-purple-950/50 rounded-xl">
              <h4 className="text-sm font-medium text-pink-900 dark:text-pink-100 mb-3">Personalize your recommendations</h4>
              
              <div className="flex flex-wrap gap-4 items-center">
                {/* Gender and Halal mode selection */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-pink-700 dark:text-pink-300">You are:</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setGender('male')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${gender === 'male' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-pink-200 dark:border-purple-700'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="5" r="3"/>
                          <line x1="12" y1="8" x2="12" y2="21"/>
                          <line x1="8" y1="18" x2="16" y2="16"/>
                        </svg>
                        Male
                      </button>
                      <button 
                        onClick={() => setGender('female')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${gender === 'female' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-pink-200 dark:border-purple-700'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="5"/>
                          <path d="M12 13v8"/>
                          <path d="M9 18h6"/>
                        </svg>
                        Female
                      </button>
                      <button 
                        onClick={() => setGender('cat')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${gender === 'cat' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-pink-200 dark:border-purple-700'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/>
                          <path d="M8 14v.5"/>
                          <path d="M16 14v.5"/>
                          <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
                        </svg>
                        Cat
                      </button>
                    </div>
                  </div>
                  
                  {/* Halal mode toggle */}
                  <div className="flex items-center gap-2 ml-0 sm:ml-4">
                    <label className="text-xs font-medium text-pink-700 dark:text-pink-300">Halal Mode:</label>
                    <button 
                      onClick={toggleHalalMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${halalMode ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className="sr-only">Toggle Halal Mode</span>
                      <span 
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${halalMode ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                      <svg 
                        className={`absolute right-1 h-4 w-4 ${halalMode ? 'text-white' : 'text-transparent'}`} 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M19 5c0 9-7 12-7 12s-7-3-7-12a7 7 0 0 1 14 0Z"/>
                        <circle cx="12" cy="10" r="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full mt-6 sm:mt-8 py-4 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span>✨ Generate Fashion Recommendations</span>
              )}
            </Button>
            
            {/* Loading sequence message below the button */}
            {isLoading && loadingStage && (
              <div className="mt-4 p-3 bg-pink-50/80 dark:bg-purple-950/50 rounded-lg text-center animate-pulse">
                <p className="text-pink-700 dark:text-pink-300">{loadingStage}</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {renderResults()}
            
            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleReset}
                className="px-6 py-3 text-base font-medium bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 dark:bg-gray-800 dark:text-pink-300 dark:border-purple-700 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Halal Mode Information Dialog */}
      <AnimatePresence>
        {halalInfoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHalalInfoOpen(false)}
            />
            <motion.div
              className="relative z-10 bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md mx-4 shadow-2xl border border-pink-100 dark:border-purple-800"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Halal Mode Information</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Please note that while Halal Mode attempts to provide modest fashion recommendations according to Islamic guidelines, the results may not fully adhere to these guidelines due to limitations in the AI&apos; s understanding and implementation.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    We recommend using your own judgment when evaluating the modesty of the suggested outfits.
                  </p>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setHalalInfoOpen(false)}
                      className="bg-pink-500 hover:bg-pink-600 text-white"
                    >
                      I Understand
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Tutorial Dialog */}
      <VideoDialog 
        isOpen={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
        videoId="dQw4w9WgXcQ" // Example YouTube video ID
        title="How to Use KasiFesyen"
      />
    </div>
  );
}
