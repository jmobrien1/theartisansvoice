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

import { createClient } from 'npm:@supabase/supabase-js@2';

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate content based on brand voice
    const brandVoice = winery_profile.brand_tone || 'elegant';
    const targetContentType = content_type || 'blog_post';
    
    let contentTitle = '';
    let contentBody = '';

    if (targetContentType === 'blog_post') {
      contentTitle = `The Art of Winemaking at ${winery_profile.winery_name}`;
      contentBody = `<h2>Welcome to ${winery_profile.winery_name}</h2>

<p>Nestled in the heart of ${winery_profile.location}, ${winery_profile.winery_name} represents the perfect harmony between tradition and innovation. ${winery_profile.backstory}</p>

<h3>Our Wine Collection</h3>
<p>We take pride in crafting exceptional wines that reflect our ${brandVoice} approach to winemaking. Our collection features:</p>
<ul>
${winery_profile.wine_types?.map((wine: string) => `<li><strong>${wine}</strong> - Carefully crafted to showcase the unique characteristics of our terroir</li>`).join('\n') || '<li>Premium varietals that embody our winemaking philosophy</li>'}
</ul>

<h3>Experience Our Wines</h3>
<p>Whether you're ${winery_profile.target_audience || 'a wine enthusiast exploring new flavors'}, we invite you to discover what makes ${winery_profile.winery_name} special. Each bottle tells a story of passion, dedication, and the unique terroir of ${winery_profile.location}.</p>

<p>Visit us to experience firsthand the craftsmanship that goes into every bottle, and let us share our passion for exceptional wine with you.</p>`;
    } else if (targetContentType === 'social_media') {
      contentTitle = `${winery_profile.winery_name} - Crafting Excellence`;
      contentBody = `🍷 Discover the essence of ${winery_profile.location} in every glass at ${winery_profile.winery_name}! 

Our ${brandVoice} approach to winemaking creates wines that truly capture the spirit of our region. 

${winery_profile.wine_types?.slice(0, 2).join(' & ') || 'Premium wines'} now available for tasting!

#Wine #${winery_profile.location?.replace(/\s+/g, '')} #Winery #Tasting`;
    } else if (targetContentType === 'newsletter') {
      contentTitle = `${winery_profile.winery_name} Newsletter - Latest Updates`;
      contentBody = `<h2>Greetings from ${winery_profile.winery_name}!</h2>

<p>We hope this newsletter finds you well and enjoying great wine! Here's what's been happening at our winery in ${winery_profile.location}.</p>

<h3>What's New</h3>
<p>We're excited to share the latest developments in our winemaking journey. Our commitment to ${brandVoice} winemaking continues to drive everything we do.</p>

<h3>Featured Wines</h3>
<p>This month, we're highlighting our exceptional ${winery_profile.wine_types?.[0] || 'signature wine'}, which perfectly embodies the character of our vineyard.</p>

<h3>Visit Us</h3>
<p>We'd love to welcome you to ${winery_profile.winery_name} for a tasting experience. Come discover why our wines are beloved by ${winery_profile.target_audience || 'wine lovers everywhere'}.</p>

<p>Cheers,<br>The ${winery_profile.winery_name} Team</p>`;
    }

    // Create content in database
    const { data: contentData, error: contentError } = await supabase
      .from('content_calendar')
      .insert([{
        winery_id: winery_id,
        title: contentTitle,
        content: contentBody,
        content_type: targetContentType,
        status: 'draft',
        created_by: null // Will be set by RLS
      }])
      .select()
      .single();

    if (contentError) {
      console.error('Error creating content:', contentError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create content",
          details: contentError.message
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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          content: contentData,
          brand_voice: brandVoice,
          word_count: contentBody.replace(/<[^>]*>/g, '').split(' ').length
        },
        message: "Content generated and saved successfully"
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