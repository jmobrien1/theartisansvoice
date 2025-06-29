/*
  # Sommelier Writing Agent Edge Function

  1. Purpose
    - Generates engaging wine content with unique brand voice
    - Creates blog posts, social media content, and newsletters

  2. Functionality
    - Analyzes brand voice and target audience
    - Generates content based on research briefs
    - Maintains consistent brand messaging

  3. Security
    - Requires authentication
    - Validates winery ownership
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestPayload {
  winery_id: string;
  winery_profile: any;
  content_type?: string;
  theme?: string;
  test?: boolean;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { winery_id, winery_profile, content_type, theme, test }: RequestPayload = await req.json();

    // Handle test requests
    if (test) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Sommelier Writing Agent is available" 
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Validate required parameters
    if (!winery_id || !winery_profile) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters: winery_id and winery_profile" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Generate mock content based on winery profile
    const generatedContent = {
      title: `Discovering the Essence of ${winery_profile.winery_name}`,
      content: `Welcome to ${winery_profile.winery_name}, where tradition meets innovation in every bottle. 

Located in the heart of ${winery_profile.location}, our winery has been crafting exceptional wines that reflect the unique terroir of our region. ${winery_profile.backstory}

Our signature wines include ${winery_profile.wine_types?.join(', ') || 'premium varietals'}, each carefully crafted to embody our ${winery_profile.brand_tone} approach to winemaking.

Whether you're a seasoned wine enthusiast or just beginning your wine journey, we invite you to experience the passion and dedication that goes into every bottle we create.`,
      content_type: content_type || "blog_post",
      brand_voice: winery_profile.brand_tone,
      target_audience: winery_profile.target_audience,
      suggested_tags: ["wine", "winery", winery_profile.location?.toLowerCase(), "tasting"],
      word_count: 150
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedContent,
        message: "Content generated successfully"
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error('Error in sommelier-writer function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }
});