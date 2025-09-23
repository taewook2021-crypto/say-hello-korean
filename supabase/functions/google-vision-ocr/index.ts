import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('User authentication failed');
    }

    console.log('User authenticated:', user.id);

    // Get user profile and subscription tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Error fetching user profile');
    }

    const subscriptionTier = profile?.subscription_tier || 'free';
    console.log('User subscription tier:', subscriptionTier);

    // Check if user has premium subscription (basic or pro)
    if (subscriptionTier === 'free') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Vision OCR is available for premium users only. Please upgrade to use this feature.',
          requiresUpgrade: true
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check daily usage limit (50 images per day for premium users)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usageData, error: usageError } = await supabase
      .from('google_vision_usage')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single();

    let currentUsage = 0;
    if (usageData) {
      currentUsage = usageData.usage_count;
    }

    console.log(`Current usage for ${today}: ${currentUsage}/50`);

    if (currentUsage >= 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Daily Google Vision limit reached (50 images per day). Please try again tomorrow.',
          dailyLimitReached: true,
          currentUsage,
          dailyLimit: 50
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Usage check passed, parsing request body...');
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
              imageContext: {
                languageHints: ['ko', 'en'], // Korean and English
              },
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

    // Update usage count
    const { error: updateError } = await supabase
      .from('google_vision_usage')
      .upsert({
        user_id: user.id,
        usage_date: today,
        usage_count: currentUsage + 1
      }, {
        onConflict: 'user_id,usage_date'
      });

    if (updateError) {
      console.error('Error updating usage count:', updateError);
      // Don't fail the request for usage tracking errors
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

    console.log(`Google Vision OCR processed successfully. Found ${textBlocks.length} text blocks. Usage: ${currentUsage + 1}/50`);

    return new Response(
      JSON.stringify({
        success: true,
        fullText,
        textBlocks,
        usage: {
          current: currentUsage + 1,
          limit: 50,
          remaining: 49 - currentUsage
        }
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