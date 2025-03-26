"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textPrompt, setTextPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    setResult(null);
    setError(null);
    setIsLoading(true);

    try {
      if (!file && !textPrompt) {
        throw new Error("Please upload an image or provide a text description");
      }

      const formData = new FormData();
      if (file) formData.append("image", file);
      if (textPrompt) formData.append("prompt", textPrompt);

      const response = await fetch("/api/fashion", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.rawResponse) {
        try {
          const sanitized = data.rawResponse.replace(/```json/g, '').replace(/```/g, '');
          const parsedData = JSON.parse(sanitized);
          setResult({
            ...parsedData,
            generatedImage: parsedData.generatedImage?.trimEnd()
          });
        } catch (parseError) {
          throw new Error('Failed to parse fashion recommendations');
        }
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const renderResults = () => {
    if (!result) return null;

    return (
      <div className="mt-8 space-y-8">
        <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-lg border border-pink-100/50 dark:border-purple-900/50 p-6">
          <h2 className="text-2xl font-bold mb-6 text-pink-800 dark:text-pink-200">
            Fashion Recommendations
          </h2>
          
          <div className="space-y-8">
            {/* Item Details */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-pink-700 dark:text-pink-300">
                {result.itemType}
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-pink-600 dark:text-pink-400 mb-3">
                    Item Description
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
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
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-pink-200 dark:border-purple-700">
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
            {result.outfits?.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-4 text-pink-700 dark:text-pink-300">
                  Outfit Suggestions
                </h3>
                <div className="space-y-4">
                  {result.outfits.map((outfit: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 bg-pink-50/50 dark:bg-purple-950/50 rounded-lg"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        {outfit.generatedImage && (
                          <div className="flex-shrink-0">
                            <div className="relative w-full md:w-48 h-48 rounded-lg overflow-hidden border-2 border-pink-200 dark:border-purple-700">
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
                  ))}
                </div>
              </section>
            )}

            {/* Styling Tips */}
            {result.stylingTips?.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold mb-3 text-pink-700 dark:text-pink-300">
                  Styling Tips
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {result.stylingTips.map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Image Generation Prompt section removed as requested */}
          </div>
        </div>

        {/* Generated Outfit Image */}
        {result.generatedImage && (
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-4 text-pink-700 dark:text-pink-300">
              Generated Outfit
            </h3>
            <img 
              src={result.generatedImage}
              alt="Generated outfit"
              className="rounded-xl shadow-lg border-2 border-pink-200 dark:border-purple-700 w-96 h-96 object-cover"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] gap-8 p-8 sm:p-12 bg-gradient-to-b from-pink-50 to-white dark:from-purple-950 dark:to-gray-950">
      <header className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          KasiFesyen
        </h1>
        <p className="text-lg text-pink-800/80 dark:text-pink-200/80 font-serif italic">
          Your AI-powered personal fashion stylist
        </p>
      </header>

      <main className="max-w-4xl mx-auto w-full">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-pink-100/50 dark:border-purple-900/50">
          <div className="grid md:grid-cols-2 gap-8">
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
                  <Image 
                    src={preview} 
                    alt="Preview" 
                    fill 
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="text-center">
                    <Image
                      src="/upload.svg"
                      alt="Upload icon"
                      width={28}
                      height={28}
                      className="mx-auto mb-2"
                    />
                    <p className="text-sm text-pink-600/80 dark:text-pink-300/80">
                      Click to upload or drag & drop
                    </p>
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

          {error && (
            <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-8 py-6 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        {renderResults()}
      </main>
    </div>
  );
}
