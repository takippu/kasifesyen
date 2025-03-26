import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/client'
import { v4 } from 'uuid'
import { currencyConverter } from './currency-converter';
import { base64ToBlob } from '@/lib/utils/image-utils';

export interface ReceiptData {
  id: string
  items: {
    name: string
    price: number
    quantity?: number
  }[]
  subtotal: number
  tax?: {
    rate: number
    amount: number
  }
  discounts?: {
    description: string
    amount: number
  }[]
  total: number
  date: string
  store_name: string
  image_url: string
  user_id: string
  created_at: string
  updated_at: string
  metadata: ReceiptMetadata  // Update metadata type
  category: string;  // Add category field
  tax_category: string | null;  // Add tax_category field
}

interface ParsedReceiptData {
  store_name: string;
  items: Array<{ name: string; price: number; quantity?: number }>;
  subtotal: number;
  tax?: { rate: number; amount: number };
  discounts?: Array<{ description: string; amount: number }>;
  total: number;
  date: string;
  category: string;
  taxCategory: string | null;
  currency_converted?: boolean;
  original_currency?: string | null;
}

// Define interfaces for the parsed data from Gemini
interface ParsedItem {
  name: string;
  price: number | string;
  quantity?: number | string;
}

interface ParsedDiscount {
  description: string;
  amount: number | string;
}

// Add FileOptions interface extension for the signal property
// This extends the FileOptions from Supabase to include the AbortSignal
interface ExtendedFileOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  signal?: AbortSignal; // Add signal support for abort controller
}

interface ReceiptMetadata {
  type?: 'manual' | 'scanned';  // Add type property as optional
  currency?: string;
  language?: string;
  confidence?: number;
  currency_converted: boolean;
  original_currency: string | null;
}

// Add this interface near the top with other interfaces
interface CurrencyContext {
  location?: string;
  language?: string;
  receiptLanguage?: string;
  storeLocation?: string;
}

const gemini = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

const PROMPT_TEMPLATE =
`
You will be provided with an image. Your task is to analyze the image and determine if it represents a valid receipt.

**1. Receipt Verification:**

* First, carefully examine the image to determine if it is a receipt.
* A valid receipt should contain identifiable elements such as:
    * Store/merchant name
    * Date of purchase
    * List of purchased items with prices
    * Total amount paid
    * Payment method (if available)

**2. Non-Receipt Handling:**

* If the image is NOT a valid receipt (e.g., a random photo, document, or other non-receipt image), respond with ONLY the following JSON structure:

    \`\`\`json
    {
        "isReceipt": false,
        "reason": "Brief explanation of why this is not a valid receipt image"
    }
    \`\`\`

**3. Receipt Data Extraction:**

* If the image IS a valid receipt, extract the following information and structure it into a JSON object:

    \`\`\`json
    {
        "isReceipt": true,
        "data": {
            "storeName": "Store Name",
            "date": "YYYY-MM-DD",
            "items": [
                {
                    "name": "Item Description",
                    "price": Numerical Price (in MYR - Total price per item, after quantity multiplication),
                    "quantity": Numerical Quantity (or null if not available)
                }
                // ... more items
            ],
            "subtotal": Numerical Subtotal (in MYR),
            "tax": {
                "amount": Numerical Tax Amount (in MYR),
                "rate": Numerical Tax Rate (or null if not available)
            },
            "total": Numerical Total (in MYR),
            "paymentMethod": "Payment Method (e.g., Cash, Credit Card, Debit Card, or null if not available)",
            "category": "General Expense Category",
            "currencyConverted": Boolean (true if converted, false if not),
            "originalCurrency": "Currency Code (e.g., USD, EUR, or null if MYR)"
        },
        "taxCategory": "Tax Relief Category",
        "confidenceScore": 0.9,
        "metadata": {
            "currencyConverted": Boolean,
            "originalCurrency": "Currency Code"
        },


    }
    \`\`\`

**4. Extraction Guidelines:**

* **Items Array:**
    * Include ONLY actual products/services purchased.
    * Exclude discounts, taxes, and other non-item entries.
    * Clean item names to remove discount/override text.
    * **Price Handling: (CRUCIAL AND IMPORTANT)**
        * **If both unit price and total price (after quantity multiplication) are present, ALWAYS use the total price for the "price" field.**
        * **If only the unit price is present, use that value.**
        * **If only the total price is present, use that value.**
    * **Quantity Handling:** If quantity is ambiguous or not present, use \`null\`. If quantity is present but unclear, use your best judgment.
    * Discounts/Adjustments: Exclude discounts, adjustments, or non-item entries from the items array.
    * If quantity is ambiguous or not present, use \`null\`.
* **Numerical Values:**
    * Remove all currency symbols.
* **Currency Identification (CRUCIAL AND IMPORTANT):**
* First, look for any currency indicators on the receipt
* If you see "$" without other context, default to "USD"
* Set \`currencyConverted\` to:
    * \`true\` if ANY currency symbol/code is found that's not RM or MYR
    * \`true\` if prices appear to be in non-MYR or non-RM amounts
    * \`false\` ONLY if explicitly in MYR/RM
* For \`originalCurrency\`, ALWAYS set to currency code:
    * If you see "$" → set to "USD"
    * If you see "USD" → set to "USD"
    * If you see "£" → set to "GBP"
    * If you see "€" → set to "EUR"
    * If you see "RM" → set to null
    * If unsure but see "$" → default to "USD"
    * Never leave empty - use "USD" for "$" if no other indication
    * If you are unsure of the correct numerical value, use your best judgment.
* **Date Format:**
    * Attempt to parse dates from various formats (MM/DD/YYYY, DD/MM/YYYY, etc.) and convert them to YYYY-MM-DD. If the date cannot be determined, use \`null\`.
* **Missing Information:**
    * Use \`null\` or empty strings for missing values. If crucial information is missing, return \`isReceipt: false\` and a detailed reason.
* **General Expense Category:**
    * Determine the most general category of the receipt. Use one of these Categories:
        * "Food & Dining"
        * "Transportation"
        * "Travel & Lodging"
        * "Office Supplies & Equipment"
        * "Utilities & Bills"
        * "Entertainment"
        * "Medical & Health"
        * "Shopping/Retail"
        * "Professional Services"
        * "Education & Training"
        * "Miscellaneous"
    * Use your best judgement to determine the category.
* **Accuracy:**
    * Pay close attention to detail to minimize errors in store name, item prices, quantities, and totals.
    * If there are multiple potential store names, or amounts, use the one that appears most likely.
* **Confusing Quantity:**
    * If the quantity is confusing, or shows a value that is impossible, use \`null\`.
* **Wrong Amount:**
    * Double check all amounts, and make sure to use the correct amount.
    * **Wrong store name:**
    * If there are multiple store names, use the most prominent one.
* Confidence Score:
    * Add a confidence score (0-1) for each extracted field. 1 = very confident, 0 = not confident.
    * If you are not confident in the extracted value, use 0.
    * If you are very confident, use 1.
    * If you are somewhat confident, use a value between 0 and 1.

**5. Output Format:**

* Your response MUST be in valid JSON format.

**Example of Valid Receipt Output (Currency Conversion):**

\`\`\`json
{
    "isReceipt": true,
    "data": {
        "storeName": "International Cafe",
        "date": "2024-03-15",
        "items": [
            {
                "name": "Coffee",
                "price": 20.80, // Converted from USD 4.50 (total price) to MYR
                "quantity": 1
            },
            {
                "name": "Pastry",
                "price": 13.87, // Converted from USD 3.00 (total price) to MYR
                "quantity": 2
            }
        ],
        "subtotal": 34.67, // Converted to MYR
        "tax": {
            "amount": 2.43, // Converted to MYR
            "rate": 0.07
        },
        "total": 37.10, // Converted to MYR
        "paymentMethod": "Credit Card",
        "category": "Food & Dining",
        "currencyConverted": true,
        "originalCurrency": "USD"
    },
    "taxCategory": null,
    "confidenceScore": 0.9,
    "metadata": {
        "currencyConverted": true,
        "originalCurrency": "USD"
    },
    "category": "Food & Dining",
}
\`\`\`
`;

// Add new prompt template for tax relief categorization
const TAX_RELIEF_PROMPT = `
Given a receipt with the following items, determine the most appropriate tax relief category for this receipt.
I will provide you with items from a receipt. Please analyze them carefully and determine if they qualify for any tax relief category.

Categories and their descriptions:
* "Self": Basic personal relief.
* "Parent Medical": Medical expenses for parents (special treatment, needs, Covid-19 tests).
* "Disability Equipment": Purchase of basic support equipment for disabled individuals (self, spouse, child, parent).
* "Disabled Person": Relief for disabled individuals.
* "Self Education": Education fees for self (tertiary, Masters, PhD, upskilling, vocational).
* "Medical Illness": Medical expenses for serious diseases, fertility treatments, vaccinations, health screenings.
* "Medical Other": Medical expenses for exams, Covid-19 tests, mental health consultations.
* "Lifestyle": Purchase or subscription of books / journals / magazines / newspapers / other similar publications. Purchase of personal computer, smartphone or tablet. Payment of monthly bill for internet subscription. Skill improvement / personal development course fee.
* "eBook/Digital": Digital purchases (books, software), internet, gym memberships.
* "Sports": Sports equipment, rental fees, competition fees.
* "Breastfeeding": Breastfeeding equipment for children aged 2 and below.
* "Childcare": Childcare fees for registered centers/kindergartens (children 6 and below).
* "Education Savings": Net deposits in Skim Simpanan Pendidikan Nasional.
* "Spouse/Alimony": Relief for spouse or alimony payments.
* "Disabled Spouse": Relief for disabled spouse.
* "Unmarried Child": Relief for unmarried children.
* "Child Education (18+)": Relief for unmarried children (18+) in tertiary education.
* "Disabled Child": Relief for disabled children.
* "Disabled Child Education": Additional relief for disabled children (18+) in education.
* "Life Insurance": Life insurance premiums.
* "Retirement/Pension": Mandatory/voluntary contributions to approved schemes (KWSP/EPF, pension).
* "Annuity/PRS": Deferred Annuity and Private Retirement Scheme.
* "Medical Insurance": Education and medical insurance.
* "SOCSO": Contributions to the Social Security Organisation.
* "EV Charging": Expenses on charging facilities for Electric Vehicles (personal use).

If the receipt does not qualify for any tax relief category, respond with "null".

Receipt items:
{ITEMS}

Please respond with just the category name or "null" without any additional explanation.`;

class ReceiptProcessor {
  private supabase = createClient()

  private async optimizeImage(base64Data: string): Promise<string> {
    try {
      // Create an image element to load the base64 data
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = base64Data;
      });

      // Calculate new dimensions (max width/height of 1500px while maintaining aspect ratio)
      let width = img.width;
      let height = img.height;
      const maxDimension = 1500;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Create a canvas to resize and compress the image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Draw the image with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with quality of 0.8 (80%)
      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Log size reduction
      const originalSize = Math.round(base64Data.length / 1024);
      const optimizedSize = Math.round(optimizedBase64.length / 1024);
      console.log(`Image optimized: ${originalSize}KB -> ${optimizedSize}KB (${Math.round((1 - optimizedSize/originalSize) * 100)}% reduction)`);

      return optimizedBase64;
    } catch (error) {
      console.error('Error optimizing image:', error);
      // Return original if optimization fails
      return base64Data;
    }
  }

  public async uploadImage(
    base64Image: string, 
    userId: string, 
    signal?: AbortSignal
  ): Promise<string> {
    try {
      console.log('👉 uploadImage: Starting image upload...');
      
      // Check if already aborted before starting the upload
      if (signal?.aborted) {
        console.log('👉 uploadImage: Signal already aborted before starting upload');
        throw new DOMException('Aborted', 'AbortError');
      }
      
      // Check if already a URL (from previous upload)
      if (base64Image.startsWith('https://')) {
        return base64Image
      }
      
      console.log('👉 uploadImage: Uploading to Supabase Storage...');

      // Upload to Supabase Storage
      const { data, error } = await this.supabase
        .storage
        .from('receipt-images')
        .upload(
          `temp/${userId}/${v4()}.jpg`, 
          base64ToBlob(base64Image), 
          {
            contentType: 'image/jpeg',
            cacheControl: '3600', // Temporary file so shorter cache
            upsert: false,
            signal: signal
          } as ExtendedFileOptions
        )

      if (error) throw error

      // Get public URL
      const { data: publicUrl } = this.supabase
        .storage
        .from('receipt-images')
        .getPublicUrl(data.path)

      console.log('👉 uploadImage: Successfully uploaded image to:', data.path);
      return publicUrl.publicUrl
    } catch (error) {
      console.error('Error uploading image to Supabase:', error)
      throw error
    }
  }

  private async processImageWithGemini(base64Image: string): Promise<ParsedReceiptData> {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Extract the following information from this receipt image in JSON format: store name, items (with name, price, and quantity if available), subtotal, tax (rate and amount if available), discounts (description and amount if available), total, and date. Format numbers as numbers, not strings.',
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image.split(',')[1],
                },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to process image')
    }

    const data = await response.json()
    const jsonString = data.candidates[0].content.parts[0].text
    const extractedData = JSON.parse(jsonString.substring(
      jsonString.indexOf('{'),
      jsonString.lastIndexOf('}') + 1
    ))

    return extractedData
  }

  private async validateAndFormatData(data: ParsedReceiptData): Promise<ParsedReceiptData> {
    // Validate required fields
    if (!data.store_name || !data.items || !data.total || !data.date) {
      throw new Error('Missing required fields in receipt data')
    }

    // Ensure items is an array
    if (!Array.isArray(data.items)) {
      throw new Error('Items must be an array')
    }

    // Validate each item
    data.items = data.items.map(item => ({
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity ? Number(item.quantity) : 1,
    }))

    // Format numbers
    data.subtotal = Number(data.subtotal)
    data.total = Number(data.total)

    if (data.tax) {
      data.tax.rate = Number(data.tax.rate)
      data.tax.amount = Number(data.tax.amount)
    }

    if (data.discounts) {
      data.discounts = data.discounts.map(discount => ({
        description: discount.description,
        amount: Number(discount.amount),
      }))
    }

    // Validate date format
    const parsedDate = new Date(data.date)
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format')
    }
    data.date = parsedDate.toISOString().split('T')[0]

    return data
  }

  private async determineTaxCategory(items: Array<{ name: string; price: number }>): Promise<string | null> {
    try {
      // Get the model
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Format items for the prompt
      const itemsList = items.map(item => `- ${item.name}: ${item.price} MYR`).join('\n');
      const prompt = TAX_RELIEF_PROMPT.replace('{ITEMS}', itemsList);

      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const category = response.text().trim();

      // Return null if the response is "null" or invalid
      return category === "null" ? null : category;
    } catch (error) {
      console.error('Error determining tax category:', error);
      return null;
    }
  }

  public async processReceipt(
    imageData: string, 
    imageUrl: string = '', 
    signal?: AbortSignal
  ): Promise<ReceiptData> {
    let finalImageUrl = imageUrl;
    
    try {
      console.log('🔍 processReceipt: Starting receipt processing');
      
      // Check if the request has been aborted before we even start
      if (signal?.aborted) {
        console.log('🔍 processReceipt: Request already aborted before starting');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Add a handler for the abort event
      const abortHandler = () => {
        console.log('🔍 processReceipt: AbortSignal triggered during processing');
        throw new DOMException('Aborted', 'AbortError');
      };

      // Add the abort event listener if there's a signal
      if (signal) {
        console.log('🔍 processReceipt: Adding abort event listener');
        signal.addEventListener('abort', abortHandler);
      }
      
      // Get the current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Upload image if URL not provided
      if (!finalImageUrl) {
        console.log('🔍 processReceipt: No imageUrl provided, uploading image temporary for Gemini processing');
        // Pass the abort signal to the upload function
        finalImageUrl = await this.uploadImage(imageData, user.id, signal)
      }

      console.log('🔍 processReceipt: Sending image to Gemini for analysis');
      
      // Check if the request has been aborted after upload but before Gemini
      if (signal?.aborted) {
        console.log('🔍 processReceipt: Request aborted after upload but before Gemini processing');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Get the Gemini Pro Vision model
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Generate content from the image
      const result = await model.generateContent([
        { text: PROMPT_TEMPLATE },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData.split(',')[1] // Remove data URL prefix for Gemini
          }
        }
      ])

      console.log('🔍 processReceipt: Received response from Gemini');
      
      // Check again if aborted after Gemini call
      if (signal?.aborted) {
        console.log('🔍 processReceipt: Request aborted after Gemini processing');
        throw new DOMException('Aborted', 'AbortError');
      }
      
      const response = await result.response
      const text = response.text()
      
      // Remove the abort event listener when we're done
      if (signal) {
        console.log('🔍 processReceipt: Removing abort event listener');
        signal.removeEventListener('abort', abortHandler);
      }

      // Clean up the response text and parse JSON
      const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/) || text.match(/{[\s\S]*?}/)
      if (!jsonMatch) {
        console.error('Raw response:', text)
        throw new Error('Invalid response format from Gemini')
      }

      let parsedData
      try {
        parsedData = JSON.parse(jsonMatch[1] || text)
      } catch (e) {
        console.error('JSON parse error:', e)
        throw new Error('Failed to parse response from Gemini')
      }

      // Check if the image is a valid receipt
      if (parsedData.isReceipt === false) {
        // If image is not a receipt, delete it from storage and throw an error
        if (!imageUrl) {
          console.log('🔍 processReceipt: Not a valid receipt, deleting temporary image');
          await this.deleteImage(finalImageUrl)
        }
        throw new Error(`This is not a valid receipt: ${parsedData.reason || 'Unable to identify receipt content'}`)
      }

      console.log('🔍 processReceipt: Successfully processed receipt with Gemini');
      // For valid receipts, extract the data
      const receiptData = parsedData.isReceipt ? parsedData.data : parsedData;

      // Normalize the currency code before conversion
      if (receiptData.currencyConverted) {
        const originalCurrency = this.normalizeOriginalCurrency(
          receiptData.originalCurrency,
          {
            location: receiptData.storeLocation, // if available
            language: receiptData.receiptLanguage // if available
          }
        );
        
        if (originalCurrency) {
          receiptData.originalCurrency = originalCurrency;
          console.log(`🔄 Normalized currency code: ${originalCurrency}`);
        } else {
          console.warn('⚠️ Could not determine currency code, skipping conversion');
          receiptData.currencyConverted = false;
        }
      }

      // Handle currency conversion
      if (receiptData.currencyConverted && receiptData.originalCurrency) {
        try {
          console.log(`🔄 Converting from ${receiptData.originalCurrency} to MYR`);
          // Convert all monetary values from original currency to MYR
          const convertAmount = async (amount: number) => {
            const converted = await currencyConverter.convert(amount, receiptData.originalCurrency);
            console.log(`💱 Converted ${amount} ${receiptData.originalCurrency} to ${converted} MYR`);
            return converted;
          };

          // Convert items prices
          console.log('💰 Converting item prices...');
          for (const item of receiptData.items) {
            const originalPrice = item.price;
            item.price = await convertAmount(Number(originalPrice));
            console.log(`📝 Item: ${item.name} - ${originalPrice} ${receiptData.originalCurrency} -> ${item.price} MYR`);
          }

          // Convert subtotal
          if (receiptData.subtotal) {
            const originalSubtotal = receiptData.subtotal;
            receiptData.subtotal = await convertAmount(Number(originalSubtotal));
            console.log(`📊 Subtotal: ${originalSubtotal} ${receiptData.originalCurrency} -> ${receiptData.subtotal} MYR`);
          }

          // Convert tax amount if present
          if (receiptData.tax?.amount) {
            const originalTaxAmount = receiptData.tax.amount;
            receiptData.tax.amount = await convertAmount(Number(originalTaxAmount));
            console.log(`💵 Tax: ${originalTaxAmount} ${receiptData.originalCurrency} -> ${receiptData.tax.amount} MYR`);
          }

          // Convert total
          const originalTotal = receiptData.total;
          receiptData.total = await convertAmount(Number(originalTotal));
          console.log(`🏷️ Total: ${originalTotal} ${receiptData.originalCurrency} -> ${receiptData.total} MYR`);

          // Convert discounts if present
          if (receiptData.discounts) {
            console.log('💯 Converting discounts...');
            for (const discount of receiptData.discounts) {
              const originalAmount = discount.amount;
              discount.amount = await convertAmount(Number(originalAmount));
              console.log(`📉 Discount: ${originalAmount} ${receiptData.originalCurrency} -> ${discount.amount} MYR`);
            }
          }

          console.log('✅ Currency conversion completed');
        } catch (error) {
          console.error('❌ Error during currency conversion:', error);
          throw new Error(`Failed to convert currency from ${receiptData.originalCurrency} to MYR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Create the receipt record
      const timestamp = new Date().toISOString()
      const currentDate = timestamp.split('T')[0] // Today's date in YYYY-MM-DD format
      
      const receiptDataFormatted: ReceiptData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        store_name: receiptData.storeName || 'Unknown Store',
        // Always use the current date instead of the date from the receipt
        date: currentDate,
        items: receiptData.items?.map((item: ParsedItem) => ({
          name: item.name,
          price: Number(item.price),
          ...(item.quantity && { quantity: Number(item.quantity) })
        })) || [],
        subtotal: Number(receiptData.subtotal) || 0,
        ...(receiptData.tax && {
          tax: {
            rate: Number(receiptData.tax.rate) || 0,
            amount: Number(receiptData.tax.amount) || 0
          }
        }),
        ...(receiptData.discounts && {
          discounts: receiptData.discounts.map((discount: ParsedDiscount) => ({
            description: discount.description,
            amount: Number(discount.amount)
          }))
        }),
        total: Number(receiptData.total) || 0,
        image_url: finalImageUrl,
        created_at: timestamp,
        updated_at: timestamp,
        category: receiptData.category || 'Miscellaneous',
        tax_category: null, // Initially set to null
        metadata: {
          currency_converted: receiptData.currencyConverted || false,
          original_currency: receiptData.originalCurrency || null
        }
      }

      // Determine tax category after initial receipt processing
      receiptDataFormatted.tax_category = await this.determineTaxCategory(receiptDataFormatted.items);

      console.log('🔍 processReceipt: Tax category determined:', receiptDataFormatted.tax_category);
      return receiptDataFormatted
    } catch (error) {
      console.error('Error processing receipt:', error)
      
      // If there was an error and we uploaded an image, delete it
      if (!imageUrl && error instanceof Error) {
        try {
          console.log('🔍 processReceipt: Error occurred, deleting temporary image');
          await this.deleteImage(finalImageUrl)
        } catch (deleteError) {
          console.error('Error deleting image after processing failure:', deleteError)
        }
      }
      
      throw error
    }
  }

  public async saveReceipt(receiptData: ReceiptData): Promise<void> {
    try {
      // Get the current authenticated user
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        console.error('saveReceipt: User not authenticated');
        throw new Error('User not authenticated')
      }
      
      console.log('saveReceipt: Authenticated as user', user.id);
      
      // Explicitly set the user_id field to ensure it matches the authenticated user
      // This is important for RLS policies
      const receiptWithUserId = {
        ...receiptData,
        user_id: user.id
      };
      
      console.log('saveReceipt: Saving receipt with user_id:', user.id);

      const { error: dbError } = await this.supabase
        .from('receipts')
        .insert(receiptWithUserId)

      if (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }
      
      console.log('saveReceipt: Receipt saved successfully');
    } catch (error) {
      console.error('Error saving receipt:', error)
      throw error
    }
  }

  public async getReceipts(): Promise<ReceiptData[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  public async processReceiptWithoutStorage(base64Data: string): Promise<ReceiptData> {
    try {
      // Get the current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get the Gemini Pro Vision model
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' })

      // Generate content from the image
      const result = await model.generateContent([
        { text: PROMPT_TEMPLATE },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data.split(',')[1] // Remove data URL prefix for Gemini
          }
        }
      ])

      const response = await result.response
      const text = response.text()
      
      // Clean up the response text and parse JSON
      const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/) || text.match(/{[\s\S]*?}/)
      if (!jsonMatch) {
        console.error('Raw response:', text)
        throw new Error('Invalid response format from Gemini')
      }

      let parsedData
      try {
        parsedData = JSON.parse(jsonMatch[1] || text)
      } catch (e) {
        console.error('JSON parse error:', e)
        throw new Error('Failed to parse response from Gemini')
      }

      // Check if the image is a valid receipt
      if (parsedData.isReceipt === false) {
        throw new Error(`This is not a valid receipt: ${parsedData.reason || 'Unable to identify receipt content'}`)
      }

      // For valid receipts, extract the data
      const receiptData = parsedData.isReceipt ? parsedData.data : parsedData

      // Create the receipt record
      const timestamp = new Date().toISOString()
      const currentDate = timestamp.split('T')[0] // Today's date in YYYY-MM-DD format
      
      const receiptDataFormatted: ReceiptData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        store_name: receiptData.storeName || 'Unknown Store',
        // Always use the current date instead of date from receipt
        date: currentDate,
        items: receiptData.items?.map((item: ParsedItem) => ({
          name: item.name,
          price: Number(item.price),
          ...(item.quantity && { quantity: Number(item.quantity) })
        })) || [],
        subtotal: Number(receiptData.subtotal) || 0,
        ...(receiptData.tax && {
          tax: {
            rate: Number(receiptData.tax.rate) || 0,
            amount: Number(receiptData.tax.amount) || 0
          }
        }),
        ...(receiptData.discounts && {
          discounts: receiptData.discounts.map((discount: ParsedDiscount) => ({
            description: discount.description,
            amount: Number(discount.amount)
          }))
        }),
        total: Number(receiptData.total) || 0,
        image_url: '',  // Will be filled later
        created_at: timestamp,
        updated_at: timestamp,
        category: receiptData.category || 'Miscellaneous',
        tax_category: receiptData.taxCategory || null,
        metadata: {
          currency_converted: receiptData.currencyConverted || false,
          original_currency: receiptData.originalCurrency || null
        }
      }

      return receiptDataFormatted
    } catch (error) {
      console.error('Error processing receipt:', error)
      throw error
    }
  }

  public async uploadImageToPermanentStorage(
    base64Image: string, 
    signal?: AbortSignal
  ): Promise<string> {
    try {
      console.log('⬆️ uploadImageToPermanentStorage: Starting upload...');
      
      // Check if already aborted before starting
      if (signal?.aborted) {
        console.log('⬆️ uploadImageToPermanentStorage: Signal already aborted before starting upload');
        throw new DOMException('Aborted', 'AbortError');
      }
      
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check if already a URL (from previous upload)
      if (base64Image.startsWith('https://')) {
        return base64Image
      }

      const userId = user.id
      const imageId = v4()

      console.log('⬆️ uploadImageToPermanentStorage: Uploading to permanent storage...');
      
      // Check if aborted right before the upload
      if (signal?.aborted) {
        console.log('⬆️ uploadImageToPermanentStorage: Signal aborted just before upload');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Upload to Supabase Storage
      const { data, error } = await this.supabase
        .storage
        .from('receipt-images')
        .upload(
          `/${userId}/${imageId}.jpg`, 
          base64ToBlob(base64Image), 
          {
            contentType: 'image/jpeg',
            cacheControl: '31536000', // Cache for 1 year - permanent storage
            upsert: false,
            signal: signal
          } as ExtendedFileOptions
        )

      if (error) throw error

      // Get public URL
      const { data: publicUrl } = this.supabase
        .storage
        .from('receipt-images')
        .getPublicUrl(data.path)

      console.log('⬆️ uploadImageToPermanentStorage: Successfully uploaded image to:', data.path);
      return publicUrl.publicUrl
    } catch (error) {
      console.error('Error uploading image to permanent storage:', error)
      throw error
    }
  }

  public async deleteImage(imageUrl: string): Promise<void> {
    // If no imageUrl provided, just return
    if (!imageUrl || !imageUrl.trim()) {
      console.log('No image URL provided for deletion, skipping');
      return;
    }
    
    try {
      // Extract the filename from the public URL
      const url = new URL(imageUrl);
      
      // Check if this is a Supabase storage URL
      if (!url.pathname.includes('storage/v1')) {
        console.log('Not a Supabase storage URL, skipping deletion:', imageUrl);
        return;
      }
      
      const pathParts = url.pathname.split('/');
      // Find the index of receipt-images in the path
      const bucketIndex = pathParts.findIndex(part => part === 'receipt-images' || part === 'receipts');
      
      if (bucketIndex === -1) {
        console.log('Could not identify bucket in URL:', imageUrl);
        return;
      }
      
      // Get the bucket name
      const bucketName = pathParts[bucketIndex];
      
      // Get the path after the bucket name
      const filename = pathParts.slice(bucketIndex + 1).join('/');
      
      console.log(`Attempting to delete ${filename} from ${bucketName} bucket`);

      // Delete the image from storage
      const { error } = await this.supabase
        .storage
        .from(bucketName)
        .remove([filename]);

      if (error) {
        // Log but don't throw for 404 errors (file not found)
        if (error.message.includes('Not Found') || error.message.includes('404')) {
          console.log('File not found, may have been already deleted:', filename);
          return;
        }
        throw error;
      }
      
      console.log('Successfully deleted image:', filename);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't rethrow to prevent cascading failures during cleanup
    }
  }

  // Add this helper function at class level
  private normalizeOriginalCurrency(currency: string | null, context: CurrencyContext = {}): string | null {
    if (!currency) return null;
    
    // First, clean up the input
    const cleanCurrency = currency.trim().toUpperCase();
    
    // Direct ISO code matches (common currencies)
    const isoCodes = new Set([
      'MYR', 'USD', 'GBP', 'EUR', 'JPY', 'CNY', 'SGD', 'AUD', 'CAD', 
      'NZD', 'CHF', 'HKD', 'TWD', 'KRW', 'INR', 'THB', 'VND', 'IDR', 
      'PHP', 'MMK', 'BND'
    ]);
    
    if (isoCodes.has(cleanCurrency)) {
      return cleanCurrency;
    }
  
    // Common symbol mappings
    const symbolMap: Record<string, string[]> = {
      '$': ['USD', 'CAD', 'AUD', 'SGD', 'HKD'],
      '£': ['GBP'],
      '€': ['EUR'],
      '¥': ['JPY', 'CNY'],
      '₹': ['INR'],
      '฿': ['THB'],
      'RM': ['MYR'],
      'S$': ['SGD'],
      'A$': ['AUD'],
      'C$': ['CAD'],
      'NT$': ['TWD'],
      'HK$': ['HKD'],
      '₩': ['KRW'],
      '₫': ['VND'],
      'Rp': ['IDR'],
      '₱': ['PHP'],
      'K': ['MMK'],
      'B$': ['BND']
    };
  
    // Check for symbols in the input
    for (const [symbol, possibleCodes] of Object.entries(symbolMap)) {
      if (cleanCurrency.includes(symbol)) {
        // If we have context (like store location or receipt language),
        // use it to determine the most likely currency
        if (context.location || context.language) {
          // Add logic here to determine the correct currency based on context
          // For now, return the first possible code
          console.log(`🌍 Currency context - Location: ${context.location}, Language: ${context.language}`);
        }
        
        // If multiple possibilities, log them
        if (possibleCodes.length > 1) {
          console.log(`⚠️ Ambiguous currency symbol "${symbol}" could be: ${possibleCodes.join(', ')}`);
          console.log(`ℹ️ Using ${possibleCodes[0]} based on available context`);
        }
        
        return possibleCodes[0];
      }
    }
  
    // If no match found, log warning and return as-is if it looks like a currency code
    console.warn(`⚠️ Unknown currency format: ${currency}`);
    return cleanCurrency.length === 3 ? cleanCurrency : null;
  }
}

export const receiptProcessor = new ReceiptProcessor()