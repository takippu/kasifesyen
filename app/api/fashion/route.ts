import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

type GeminiImageConfig = {
  model: string;
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    responseModalities: string[];
    responseMimeType: string;
  };
};

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

// Function to get gender-specific and halal mode fashion guidelines
function getFashionGuidelines(gender: string, halalMode: boolean, stylePreference?: string, season?: string, occasion?: string): string {
  let guidelines = '';

  if (gender === 'cat') {
    guidelines = 'Create adorable and comfortable cat fashion recommendations.';
  } else if (halalMode) {
    if (gender === 'male') {
      guidelines = 'Ensure all outfits cover from knee to above the navel, adhering to Islamic guidelines for male modesty.';
    } else { // female
      guidelines = 'Ensure all outfits provide full coverage from head to toe, including a hijab that covers hair, ears, and neck (showing only the oval face shape). Avoid outfits that reveal body shape/lines. The chest should be covered fully by the hijab **THIS IS IMPORTANT**.';
    }
  } else {
    guidelines = `Create fashion recommendations suitable for ${gender === 'male' ? 'men' : 'women'}`;
    if (stylePreference) guidelines += ` in ${stylePreference} style`;
    if (season) guidelines += ` for ${season} season`;
    if (occasion) guidelines += ` and ${occasion} occasions`;
    guidelines += '.';
  }

  return guidelines;
}

// The prompt template for fashion recommendations
const FASHION_PROMPT = (gender: string, halalMode: boolean, stylePreference: string, season: string, occasion: string) => `
You are a fashion expert specializing in ${gender === 'cat' ? 'cat fashion' : `${gender}'s fashion`}. ${getFashionGuidelines(gender, halalMode, stylePreference, season, occasion)}

Analyze the uploaded clothing item in the image and provide detailed fashion recommendations.

1. Identify the type of clothing item (e.g., ${gender === 'cat' ? 'cat sweater, harness, bowtie' : 'shirt, pants, dress, etc'})
2. Describe its key features (color, pattern, material, style)
3. Suggest 3 different outfit combinations that would work well with this item, focusing on ${stylePreference} style for ${season} season and ${occasion} occasions
4. For each outfit, explain why it works and how it fits the specified style, season, and occasion
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
      "style": "string",
      "seasonality": "string",
      "reasoning": "string",
      "outfitPrompt": "string" // A detailed prompt to generate an image of this specific outfit
    },
    // 2 more outfits
  ],
  "stylingTips": ["string", "string", ...]
}
`;

// Set a timeout for the entire request processing
const TIMEOUT_DURATION = 60000; // 60 seconds to stay within Vercel's 30s limit

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    console.log('API route called: /api/fashion');
    
    // Parse the form data from the request
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const textPrompt = formData.get('prompt') as string | null;
    const gender = formData.get('gender') as 'male' | 'female' | 'cat' || 'female';
    const halalMode = formData.get('halalMode') === 'true';
    const stylePreference = formData.get('stylePreference') as string || 'casual';
    const season = formData.get('season') as string || 'spring';
    const occasion = formData.get('occasion') as string || 'daily';
    
    console.log('Request data:', { 
      hasImage: !!imageFile, 
      hasTextPrompt: !!textPrompt,
      textPromptContent: textPrompt,
      gender,
      halalMode
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

    // Process based on whether we have an image or text prompt
    if (imageFile) {
      console.log('Processing image file:', imageFile.name, 'Size:', imageFile.size, 'Type:', imageFile.type);
      
      // Convert the image file to the format required by Gemini
      const imagePart = await fileToGenerativePart(imageFile);
      console.log('Image converted to base64 for Gemini API');
      
      // Generate content with the image and prompt
      console.log('Sending request to Gemini API with image...');
      const result = await model.generateContent([FASHION_PROMPT(gender, halalMode, stylePreference, season, occasion), imagePart]);
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
        
        // Generate only one image for the first outfit to reduce processing time
        try {
          // Skip image generation if we're close to timeout
          if (Date.now() - requestStartTime > TIMEOUT_DURATION * 0.6) {
            console.log('Skipping image generation due to time constraints');
            return NextResponse.json(jsonResponse);
          }
          console.log('Starting image generation process for outfit suggestions...');
          
          // Use the new image generation model
          const imageModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
              temperature: 1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
              responseModalities: ["image", "text"],
              responseMimeType: "text/plain"
            } as GeminiImageConfig['generationConfig']
          });
          
          // Create a chat session for image generation
          const chatSession = imageModel.startChat({
            generationConfig: {
              temperature: 1, 
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
              responseModalities: ["image", "text"],
              responseMimeType: "text/plain"
            } as GeminiImageConfig['generationConfig'],
            history: []
          });
          
          // Generate images for all outfits
          for (let i = 0; i < jsonResponse.outfits.length; i++) {
            const outfit = jsonResponse.outfits[i];
            if (!outfit.outfitPrompt) {
              // Create a detailed prompt based on outfit details and the original item's characteristics
              const itemDesc = jsonResponse.itemDescription;
              const detailedItemDescription = `${itemDesc.color} ${jsonResponse.itemType} with ${itemDesc.pattern} pattern, made of ${itemDesc.material} material, in a ${itemDesc.style} style`;
              
              outfit.outfitPrompt = `A photorealistic fashion outfit consisting of ${outfit.pieces.join(', ')} for ${outfit.occasions.join(', ')}. The outfit MUST prominently feature the exact ${detailedItemDescription} that the user described. Maintain the precise color, pattern, material, and style characteristics of the original item.`;
            }
            
            console.log(`Generating image for outfit ${i+1}: ${outfit.name}`);
            console.log('Prompt:', outfit.outfitPrompt);
            
            try {
              // Send the outfit prompt to the chat session with enhanced instructions for accuracy
              const imageResult = await chatSession.sendMessage(`Generate a photorealistic image of: ${outfit.outfitPrompt}. It is CRITICAL that the generated image precisely matches the characteristics of the user's described clothing item, including exact color, pattern, material, and style details.`);
              
              // Extract image data from the response
              let imageData = null;
              const candidates = imageResult.response.candidates || [];
              
              // Process each candidate and part to find image data
              for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
                const parts = candidates[candidateIndex]?.content?.parts || [];
                
                for (let partIndex = 0; partIndex < parts.length; partIndex++) {
                  const part = parts[partIndex];
                  
                  if (part.inlineData) {
                    imageData = part.inlineData.data;
                    console.log(`Found image data for outfit ${i+1}`);
                    break;
                  }
                }
                
                if (imageData) break;
              }
              
              const imageUrl = imageData ? `data:image/png;base64,${imageData}` : null;
              // If image generation fails, provide a placeholder image URL
              outfit.generatedImage = imageUrl || '/placeholder-outfit.png';
              console.log(`Generated image for outfit ${i+1}: ${imageUrl ? 'Success' : 'Failed'}`);
              
            } catch (outfitError) {
              console.error(`Error generating image for outfit ${i+1}:`, outfitError);
              outfit.generatedImage = '/placeholder-outfit.png';
            }
          }
        } catch (error) {
          console.error('Image generation process error:', error);
          // Continue with the response even if image generation fails
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
      const combinedPrompt = `${FASHION_PROMPT(gender, halalMode, stylePreference, season, occasion)}\n\nUser's description: ${textPrompt}`;
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
        
        // Validate response structure
        if (!jsonResponse?.itemType || !jsonResponse?.outfits?.length || !jsonResponse?.stylingTips?.length || !jsonResponse?.itemDescription) {
          throw new Error('Invalid JSON structure from Gemini API');
        }

        console.log('Successfully parsed validated JSON response');
        console.log('Successfully parsed JSON response:', JSON.stringify(jsonResponse).substring(0, 500) + '...');
        
        // Generate only one image for the first outfit to reduce processing time
        try {
          // Skip image generation if we're close to timeout
          if (Date.now() - requestStartTime > TIMEOUT_DURATION * 0.6) {
            console.log('Skipping image generation due to time constraints');
            return NextResponse.json(jsonResponse);
          }
          console.log('Starting image generation process for outfit suggestions...');
          
          // Use the new image generation model
          const imageModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
              temperature: 1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
              responseModalities: ["image", "text"],
              responseMimeType: "text/plain"
            } as GeminiImageConfig['generationConfig']
          });
          
          // Create a chat session for image generation
          const chatSession = imageModel.startChat({
            generationConfig: {
              temperature: 1, 
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
              responseModalities: ["image", "text"],
              responseMimeType: "text/plain"
            } as GeminiImageConfig['generationConfig'],
            history: []
          });
          
          // Generate images for all outfits
          for (let i = 0; i < jsonResponse.outfits.length; i++) {
            const outfit = jsonResponse.outfits[i];
            if (!outfit.outfitPrompt) {
              // Create a detailed prompt based on outfit details and the original item's characteristics
              const itemDesc = jsonResponse.itemDescription;
              const detailedItemDescription = `${itemDesc.color} ${jsonResponse.itemType} with ${itemDesc.pattern} pattern, made of ${itemDesc.material} material, in a ${itemDesc.style} style`;
              
              outfit.outfitPrompt = `A photorealistic fashion outfit consisting of ${outfit.pieces.join(', ')} for ${outfit.occasions.join(', ')}. The outfit MUST prominently feature the exact ${detailedItemDescription} that the user described. Maintain the precise color, pattern, material, and style characteristics of the original item.`;
            }
            
            console.log(`Generating image for outfit ${i+1}: ${outfit.name}`);
            console.log('Prompt:', outfit.outfitPrompt);
            
            try {
              // Send the outfit prompt to the chat session with enhanced instructions for accuracy
              const imageResult = await chatSession.sendMessage(`Generate a photorealistic image of: ${outfit.outfitPrompt}. It is CRITICAL that the generated image precisely matches the characteristics of the user's described clothing item, including exact color, pattern, material, and style details.`);
              
              // Extract image data from the response
              let imageData = null;
              const candidates = imageResult.response.candidates || [];
              
              // Process each candidate and part to find image data
              for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
                const parts = candidates[candidateIndex]?.content?.parts || [];
                
                for (let partIndex = 0; partIndex < parts.length; partIndex++) {
                  const part = parts[partIndex];
                  
                  if (part.inlineData) {
                    imageData = part.inlineData.data;
                    console.log(`Found image data for outfit ${i+1}`);
                    break;
                  }
                }
                
                if (imageData) break;
              }
              
              const imageUrl = imageData ? `data:image/png;base64,${imageData}` : null;
              // If image generation fails, provide a placeholder image URL
              outfit.generatedImage = imageUrl || '/placeholder-outfit.png';
              console.log(`Generated image for outfit ${i+1}: ${imageUrl ? 'Success' : 'Failed'}`);
              
            } catch (outfitError) {
              console.error(`Error generating image for outfit ${i+1}:`, outfitError);
              outfit.generatedImage = '/placeholder-outfit.png';
            }
          }
        } catch (error) {
          console.error('Image generation process error:', error);
          // Continue with the response even if image generation fails
        }
        
        return NextResponse.json(jsonResponse);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        console.log('Returning raw response instead');
        // If the response is not valid JSON, return it as text
        return NextResponse.json({ rawResponse: rawText });
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