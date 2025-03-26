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

  // Preview for the uploaded image
  const [preview, setPreview] = useState<string | null>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create a preview URL for the image
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    }
  };

  // Handle text prompt change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextPrompt(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Reset previous results and errors
    setResult(null);
    setError(null);
    setIsLoading(true);

    try {
      // Check if either file or text prompt is provided
      if (!file && !textPrompt) {
        setError("Please upload an image or provide a text description");
        setIsLoading(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      if (file) {
        formData.append("image", file);
      }
      if (textPrompt) {
        formData.append("prompt", textPrompt);
      }

      // Send request to API
      const response = await fetch("/api/fashion", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      
      // Handle rawResponse if present
      if (data.rawResponse) {
        try {
          const sanitized = data.rawResponse.replace(/```json/g, '').replace(/```/g, '');
          const parsedData = JSON.parse(sanitized);
          setResult(parsedData);
        } catch (parseError) {
          setError('Failed to parse fashion recommendations');
        }
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setResult(null);
    } finally {
      setIsLoading(false);
      // Reset error state when successful
      setError(null);
    }
  };

  // Function to render the results
  const renderResults = () => {
    if (!result) return null;

    return (
      <div className="mt-8 p-6 bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-lg border border-pink-100/50 dark:border-purple-900/50">
        <h2 className="text-2xl font-bold mb-4 text-pink-800 dark:text-pink-200">
          Fashion Recommendations
        </h2>
        
        {/* Item details */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-pink-700 dark:text-pink-300">
            {result.itemType}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-pink-600 dark:text-pink-400 mb-2">Item Description</h4>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                <li>Color: {result.itemDescription?.color || 'Not specified'}</li>
                <li>Pattern: {result.itemDescription?.pattern || 'None'}</li>
                <li>Material: {result.itemDescription?.material || 'Unknown'}</li>
                <li>Style: {result.itemDescription?.style || 'Unspecified'}</li>
              </ul>
            </div>
            {preview && (
              <div className="flex justify-center items-center">
                <div className="relative w-40 h-40 overflow-hidden rounded-lg border-2 border-pink-200 dark:border-purple-700">
                  <Image 
                    src={preview} 
                    alt="Uploaded item" 
                    fill 
                    style={{ objectFit: 'cover' }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Outfit suggestions */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 text-pink-700 dark:text-pink-300">
            Outfit Suggestions
          </h3>
          <div className="space-y-6">
            {result.outfits?.map((outfit: any, index: number) => (
              <div key={index} className="p-4 bg-pink-50/50 dark:bg-purple-950/50 rounded-lg">
                <h4 className="font-medium text-pink-600 dark:text-pink-400 mb-2">
                  {outfit.name}
                </h4>
                <div className="mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Pieces: </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {outfit.pieces?.join(", ") || 'No pieces specified'}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Occasions: </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {outfit.occasions?.join(", ") || 'Various occasions'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Why it works: </span>
                  <span className="text-gray-600 dark:text-gray-400">{outfit.reasoning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Styling tips */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-pink-700 dark:text-pink-300">
            Styling Tips
          </h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
            {result.stylingTips?.map((tip: string, index: number) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Image prompt */}
        {result.imagePrompt && (
          <div>
            <h3 className="text-xl font-semibold mb-2 text-pink-700 dark:text-pink-300">
              Image Generation Prompt
            </h3>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 italic">
                {result.imagePrompt}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-pink-50 to-white dark:from-purple-950 dark:to-gray-950">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-4xl">
        <div className="w-full text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            KasiFesyen
          </h1>
          <p className="text-lg text-pink-800/80 dark:text-pink-200/80 mb-8 font-serif italic">
            Your AI-powered personal fashion stylist
          </p>
        </div>
        {/* Input Section */}
        <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-pink-100/50 dark:border-purple-900/50">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo Upload */}
            <div className="flex-1">
              <label className="block mb-3 text-sm font-medium text-pink-900 dark:text-pink-100">
                Upload your outfit
              </label>
              <div 
                className="flex items-center justify-center w-full h-40 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:bg-pink-50/50 dark:hover:bg-purple-900/20 transition-all relative"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
                {preview ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image 
                      src={preview} 
                      alt="Preview" 
                      fill 
                      style={{ objectFit: 'contain' }} 
                      className="p-2"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Image
                      src="/upload.svg"
                      alt="Upload icon"
                      width={28}
                      height={28}
                      className="mx-auto mb-2 text-pink-500 dark:text-pink-300"
                    />
                    <p className="text-sm text-pink-600/80 dark:text-pink-300/80">
                      Click to upload or drag & drop
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center my-4 md:my-0 md:mx-4">
              <span className="text-pink-400 dark:text-pink-600">OR</span>
            </div>

            {/* Text Prompt */}
            <div className="flex-1">
              <label className="block mb-3 text-sm font-medium text-pink-900 dark:text-pink-100">
                Describe your style
              </label>
              <textarea
                className="w-full h-40 p-4 border border-pink-200 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 dark:bg-purple-950/50 dark:border-purple-800 placeholder:text-pink-400/70 dark:placeholder:text-pink-500/70"
                placeholder="e.g., 'I have a blue shirt and black jeans, what should I wear?'"
                value={textPrompt}
                onChange={handleTextChange}
              ></textarea>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <Button 
            className="w-full mt-8 py-7 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span>✨ Generate Fashion Recommendations</span>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {renderResults()}
      </main>
    </div>
  );
}
