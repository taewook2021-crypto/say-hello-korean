import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Google Vision OCR function called');
    
    if (!googleVisionApiKey) {
      console.error('Google Vision API key not configured');
      throw new Error('Google Vision API key not configured');
    }

    console.log('API key found, parsing request body...');
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      console.error('No image data provided in request');
      throw new Error('No image data provided');
    }

    console.log('Image data received, processing...');
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    console.log(`Sending request to Google Vision API with image data length: ${base64Data.length}`);

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      }
    );

    console.log(`Google Vision API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Vision API error response:', errorData);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`Google Vision API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (data.responses?.[0]?.error) {
      console.error('Google Vision error:', data.responses[0].error);
      throw new Error(data.responses[0].error.message);
    }

    const textAnnotations = data.responses?.[0]?.textAnnotations || [];
    
    // Extract text blocks with bounding boxes
    const textBlocks = textAnnotations.slice(1).map((annotation: any, index: number) => ({
      id: `block-${index}`,
      text: annotation.description,
      boundingBox: {
        x: annotation.boundingPoly?.vertices?.[0]?.x || 0,
        y: annotation.boundingPoly?.vertices?.[0]?.y || 0,
        width: (annotation.boundingPoly?.vertices?.[2]?.x || 0) - (annotation.boundingPoly?.vertices?.[0]?.x || 0),
        height: (annotation.boundingPoly?.vertices?.[2]?.y || 0) - (annotation.boundingPoly?.vertices?.[0]?.y || 0),
      },
    }));

    // Full detected text
    const fullText = textAnnotations[0]?.description || '';

    console.log(`Google Vision OCR processed successfully. Found ${textBlocks.length} text blocks.`);

    return new Response(
      JSON.stringify({
        success: true,
        fullText,
        textBlocks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-vision-ocr function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});