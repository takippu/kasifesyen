import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'node:fs';
import mime from 'mime-types';

// Initialize the Google Generative AI with your API key
// The API key will be provided by the user
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Function to convert file to base64
async function fileToGenerativePart(file: File) {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  return {
    inlineData: {
      data: base64,
      mimeType: file.type,
    },
  };
}

// The prompt template for fashion recommendations
const FASHION_PROMPT = `
You are a fashion expert. Analyze the uploaded clothing item in the image and provide detailed fashion recommendations.

1. Identify the type of clothing item (e.g., shirt, pants, dress, etc.)
2. Describe its key features (color, pattern, material, style)
3. Suggest 3 different outfit combinations that would work well with this item
4. For each outfit, explain why it works and what occasions it would be suitable for
5. Provide styling tips specific to this item

Format your response as a JSON object with the following structure:
{
  "itemType": "string",
  "itemDescription": {
    "color": "string",
    "pattern": "string",
    "material": "string",
    "style": "string"
  },
  "outfits": [
    {
      "name": "string",
      "pieces": ["string", "string", ...],
      "occasions": ["string", "string", ...],
      "reasoning": "string"
    },
    // 2 more outfits
  ],
  "stylingTips": ["string", "string", ...],
  "imagePrompt": "string" // A detailed prompt that can be used to generate an image of one of the recommended outfits
}
`;

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: /api/fashion');
    
    // Parse the form data from the request
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const textPrompt = formData.get('prompt') as string | null;
    
    console.log('Request data:', { 
      hasImage: !!imageFile, 
      hasTextPrompt: !!textPrompt,
      textPromptContent: textPrompt
    });

    // Check if either image or text prompt is provided
    if (!imageFile && !textPrompt) {
      return NextResponse.json(
        { error: 'Either an image or a text prompt is required' },
        { status: 400 }
      );
    }

    // Configure the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    let result;

    // Process based on whether we have an image or text prompt
    if (imageFile) {
      console.log('Processing image file:', imageFile.name, 'Size:', imageFile.size, 'Type:', imageFile.type);
      
      // Convert the image file to the format required by Gemini
      const imagePart = await fileToGenerativePart(imageFile);
      console.log('Image converted to base64 for Gemini API');
      
      // Generate content with the image and prompt
      console.log('Sending request to Gemini API with image...');
      const result = await model.generateContent([FASHION_PROMPT, imagePart]);
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      const text = response.text();
      const sanitizedText = text
        .replace(/^\s*(```*\s*json|json)\s*\n*/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/}[^}]*$/, '}')
        .trim()
        .replace(/^\s*/, '')
        .replace(/\s*$/, '')
        .replace(/^json\s*\n/gi, '')
        .replace(/^\s*{\s*/, '{');
      console.log('Sanitized response:', sanitizedText);
      if(!sanitizedText.trim().startsWith('{')) {
        throw new Error('Invalid JSON format - missing opening brace');
      }
      console.log('Raw response from Gemini:', sanitizedText.substring(0, 500) + '...');
      
      // Parse the JSON from the response
      try {
        console.log('Attempting to parse JSON response...');
        const jsonResponse = JSON.parse(sanitizedText);
        if (!jsonResponse?.itemType || !jsonResponse?.outfits?.length || !jsonResponse?.stylingTips?.length || !jsonResponse?.itemDescription) {
          throw new Error('Invalid JSON structure from Gemini API');
        }
        
        // Generate image if prompt exists
        if (jsonResponse.imagePrompt) {
          try {
            console.log('Starting image generation process...');
            
            // Use the new image generation model
            console.log('Using Gemini 2.0 Flash Exp Image Generation model with prompt:', jsonResponse.imagePrompt);
            const imageModel = genAI.getGenerativeModel({
              model: "gemini-2.0-flash-exp-image-generation",
              generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseModalities: ["image", "text"],
                responseMimeType: "text/plain"
              }
            });
            
            // Create a chat session for image generation
            console.log('Starting chat session for image generation...');
            const chatSession = imageModel.startChat({
              generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseModalities: ["image", "text"],
                responseMimeType: "text/plain"
              },
              history: []
            });
            
            // Send the image prompt to the chat session
            console.log('Sending image generation request...');
            const imageResult = await chatSession.sendMessage(`Generate a photorealistic image of: ${jsonResponse.imagePrompt}`);
            console.log('Received image generation response');
            
            // Extract image data from the response
            let imageData = null;
            const candidates = imageResult.response.candidates || [];
            console.log('Response candidates count:', candidates.length);
            
            // Process each candidate and part to find image data
            for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
              const parts = candidates[candidateIndex]?.content?.parts || [];
              console.log(`Candidate ${candidateIndex} parts count:`, parts.length);
              
              for (let partIndex = 0; partIndex < parts.length; partIndex++) {
                const part = parts[partIndex];
                console.log(`Part ${partIndex} type:`, part.text ? 'text' : part.inlineData ? 'inlineData' : 'unknown');
                
                if (part.inlineData) {
                  imageData = part.inlineData.data;
                  console.log(`Found image data in candidate ${candidateIndex}, part ${partIndex}`);
                  break;
                }
              }
              
              if (imageData) break;
            }
            
            const imageUrl = imageData ? `data:image/png;base64,${imageData}` : null;
            console.log('Generated image data URL:', imageUrl ? `${imageUrl.substring(0, 50)}...` : 'No image generated');
            console.log('Text response:', imageResult.response.text());
            
            jsonResponse.generatedImage = imageUrl || null;
          } catch (error) {
            console.error('Image generation error:', error);
            jsonResponse.generatedImage = null;
          }
        }
        
        return NextResponse.json(jsonResponse);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        console.log('Returning raw response instead');
        // If the response is not valid JSON, return it as text
        return NextResponse.json({ rawResponse: text });
      }
    } else if (textPrompt) {
      console.log('Processing text prompt:', textPrompt);
      
      // If only text prompt is provided, use the text-only model
      const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Combine the fashion prompt with the user's text prompt
      const combinedPrompt = `${FASHION_PROMPT}\n\nUser's description: ${textPrompt}`;
      console.log('Combined prompt created, first 200 chars:', combinedPrompt.substring(0, 200) + '...');
      
      // Generate content with the text prompt
      console.log('Sending request to Gemini API with text prompt...');
      const result = await textModel.generateContent(combinedPrompt);
      console.log('Received response from Gemini API');
      
      const response = await result.response;
      const rawText = response.text();
      const sanitizedText = rawText
        .replace(/^[\s\S]*?(?={)/i, '') // Remove everything before first {
        .replace(/}[\s\S]*$/i, '}') // Remove everything after last }
        .replace(/```/gi, '')
        .replace(/^json\n/gi, '')
        .trim();
      console.log('Sanitized response text:', sanitizedText.substring(0, 500) + '...');
      
      try {
        console.log('Attempting to parse JSON response...');
        const jsonResponse = JSON.parse(sanitizedText);
        if (!jsonResponse?.itemType || !jsonResponse?.outfits?.length || !jsonResponse?.stylingTips?.length || !jsonResponse?.itemDescription) {
          throw new Error('Invalid JSON structure from Gemini API');
        }
        if (!jsonResponse?.itemType || !jsonResponse?.outfits?.length || !jsonResponse?.stylingTips?.length || !jsonResponse?.itemDescription) {
          throw new Error('Invalid JSON structure from Gemini API');
        }
        
        // Validate response structure
        if (!jsonResponse?.itemType || !jsonResponse?.outfits?.length || !jsonResponse?.stylingTips?.length || !jsonResponse?.itemDescription) {
          throw new Error('Invalid JSON structure from Gemini API');
        }

        console.log('Successfully parsed validated JSON response');
        console.log('Successfully parsed JSON response:', JSON.stringify(jsonResponse).substring(0, 500) + '...');
        
        // Generate image if prompt exists
        if (jsonResponse.imagePrompt) {
          try {
            console.log('Starting image generation process...');
            
            // Use the new image generation model
            console.log('Using Gemini 2.0 Flash Exp Image Generation model with prompt:', jsonResponse.imagePrompt);
            const imageModel = genAI.getGenerativeModel({
              model: "gemini-2.0-flash-exp-image-generation",
              generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseModalities: ["image", "text"],
                responseMimeType: "text/plain"
              }
            });
            
            // Create a chat session for image generation
            console.log('Starting chat session for image generation...');
            const chatSession = imageModel.startChat({
              generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseModalities: ["image", "text"],
                responseMimeType: "text/plain"
              },
              history: []
            });
            
            // Send the image prompt to the chat session
            console.log('Sending image generation request...');
            const imageResult = await chatSession.sendMessage(`Generate a photorealistic image of: ${jsonResponse.imagePrompt}`);
            console.log('Received image generation response');
            
            // Extract image data from the response
            let imageData = null;
            const candidates = imageResult.response.candidates || [];
            console.log('Response candidates count:', candidates.length);
            
            // Process each candidate and part to find image data
            for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
              const parts = candidates[candidateIndex]?.content?.parts || [];
              console.log(`Candidate ${candidateIndex} parts count:`, parts.length);
              
              for (let partIndex = 0; partIndex < parts.length; partIndex++) {
                const part = parts[partIndex];
                console.log(`Part ${partIndex} type:`, part.text ? 'text' : part.inlineData ? 'inlineData' : 'unknown');
                
                if (part.inlineData) {
                  imageData = part.inlineData.data;
                  console.log(`Found image data in candidate ${candidateIndex}, part ${partIndex}`);
                  break;
                }
              }
              
              if (imageData) break;
            }
            
            const imageUrl = imageData ? `data:image/png;base64,${imageData}` : null;
            console.log('Generated image data URL:', imageUrl ? `${imageUrl.substring(0, 50)}...` : 'No image generated');
            console.log('Text response:', imageResult.response.text());
            
            jsonResponse.generatedImage = imageUrl || null;
          } catch (error) {
            console.error('Image generation error:', error);
            jsonResponse.generatedImage = null;
          }
        }
        
        return NextResponse.json(jsonResponse);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        console.log('Returning raw response instead');
        // If the response is not valid JSON, return it as text
        return NextResponse.json({ rawResponse: text });
      }
    }

    console.log('No valid processing path found - this should not happen');
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  } catch (error) {
    console.error('Error processing request:', error);
    // Log the full error stack trace
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
}