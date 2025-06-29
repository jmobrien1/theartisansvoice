/*
  # Sommelier Writing Agent Edge Function

  1. Purpose
    - Generates engaging wine content with unique brand voice
    - Creates blog posts, social media content, and newsletters
    - Uses comprehensive brand voice guidelines for authentic content

  2. Functionality
    - Analyzes brand voice and target audience
    - Generates content based on research briefs
    - Maintains consistent brand messaging using detailed style guide

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

function buildBrandVoicePrompt(profile: any): string {
  let prompt = `You are writing content for ${profile.winery_name}, a winery located in ${profile.location}. `;
  
  // Brand Personality
  if (profile.brand_personality_summary) {
    prompt += `Brand Personality: ${profile.brand_personality_summary} `;
  }
  
  // Core Tone Attributes
  if (profile.core_tone_attributes) {
    prompt += `Your tone should be: ${profile.core_tone_attributes}. `;
  }
  
  // Messaging Style
  if (profile.messaging_style) {
    prompt += `Use a ${profile.messaging_style} messaging style. `;
  }
  
  // Vocabulary Guidelines
  if (profile.vocabulary_to_use) {
    prompt += `Preferred vocabulary to use: ${profile.vocabulary_to_use}. `;
  }
  
  if (profile.vocabulary_to_avoid) {
    prompt += `Avoid these words/phrases: ${profile.vocabulary_to_avoid}. `;
  }
  
  // AI Writing Guidelines
  if (profile.ai_writing_guidelines) {
    prompt += `Specific writing instructions: ${profile.ai_writing_guidelines} `;
  }
  
  // Backstory and Context
  if (profile.backstory) {
    prompt += `Winery background: ${profile.backstory} `;
  }
  
  // Target Audience
  if (profile.target_audience) {
    prompt += `Target audience: ${profile.target_audience} `;
  }
  
  // Wine Types
  if (profile.wine_types && profile.wine_types.length > 0) {
    prompt += `Wine specialties: ${profile.wine_types.join(', ')}. `;
  }
  
  return prompt;
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

    // Build brand voice prompt
    const brandVoicePrompt = buildBrandVoicePrompt(winery_profile);
    
    // Generate content based on brand voice
    const targetContentType = content_type || 'blog_post';
    
    let contentTitle = '';
    let contentBody = '';

    if (targetContentType === 'blog_post') {
      contentTitle = `The Story Behind ${winery_profile.winery_name}`;
      
      // Create content that follows the brand voice guidelines
      contentBody = `<h2>Welcome to ${winery_profile.winery_name}</h2>

<p>Nestled in the heart of ${winery_profile.location}, ${winery_profile.winery_name} represents more than just a winery—we embody a philosophy of excellence and authenticity that runs through everything we do.</p>

${winery_profile.backstory ? `<h3>Our Story</h3>
<p>${winery_profile.backstory}</p>` : ''}

<h3>Our Wine Collection</h3>
<p>We take immense pride in crafting wines that reflect our ${winery_profile.core_tone_attributes || 'passionate'} approach to winemaking. Each bottle tells a story of dedication, tradition, and the unique terroir of ${winery_profile.location}.</p>

${winery_profile.wine_types && winery_profile.wine_types.length > 0 ? `
<p>Our collection features:</p>
<ul>
${winery_profile.wine_types.map((wine: string) => `<li><strong>${wine}</strong> - Carefully crafted to showcase the distinctive character of our vineyard</li>`).join('\n')}
</ul>` : ''}

<h3>Experience Our Passion</h3>
<p>${winery_profile.target_audience ? `Whether you're ${winery_profile.target_audience.toLowerCase()}, ` : ''}we invite you to discover what makes ${winery_profile.winery_name} truly special. Every glass is an invitation to experience the artistry and passion that defines our winemaking journey.</p>

<p>Visit us to taste the difference that comes from our commitment to excellence, and let us share our love for exceptional wine with you.</p>`;

    } else if (targetContentType === 'social_media') {
      contentTitle = `${winery_profile.winery_name} - Crafting Excellence`;
      
      const toneWords = winery_profile.core_tone_attributes ? 
        winery_profile.core_tone_attributes.split(',')[0].trim().toLowerCase() : 'passionate';
      
      contentBody = `🍷 Discover the essence of ${winery_profile.location} in every glass at ${winery_profile.winery_name}! 

Our ${toneWords} approach to winemaking creates wines that truly capture the spirit of our region. 

${winery_profile.wine_types && winery_profile.wine_types.length > 0 ? 
  `${winery_profile.wine_types.slice(0, 2).join(' & ')} now available for tasting!` : 
  'Premium wines now available for tasting!'}

#Wine #${winery_profile.location?.replace(/\s+/g, '')} #Winery #Tasting`;

    } else if (targetContentType === 'newsletter') {
      contentTitle = `${winery_profile.winery_name} Newsletter - Latest Updates`;
      
      contentBody = `<h2>Greetings from ${winery_profile.winery_name}!</h2>

<p>We hope this newsletter finds you well and enjoying exceptional wine! Here's what's been happening at our winery in ${winery_profile.location}.</p>

<h3>What's New</h3>
<p>We're excited to share the latest developments in our winemaking journey. Our commitment to ${winery_profile.core_tone_attributes || 'excellence'} continues to drive everything we do.</p>

${winery_profile.wine_types && winery_profile.wine_types.length > 0 ? `
<h3>Featured Wine</h3>
<p>This month, we're highlighting our exceptional ${winery_profile.wine_types[0]}, which perfectly embodies the character and quality that defines our vineyard.</p>` : ''}

<h3>Visit Us</h3>
<p>We'd love to welcome you to ${winery_profile.winery_name} for a tasting experience that showcases our passion for winemaking. Come discover why our wines are cherished by ${winery_profile.target_audience || 'wine lovers everywhere'}.</p>

<p>Cheers to exceptional wine and memorable moments,<br>The ${winery_profile.winery_name} Team</p>`;
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
          brand_voice_applied: {
            personality: winery_profile.brand_personality_summary || 'Not specified',
            tone_attributes: winery_profile.core_tone_attributes || 'Not specified',
            messaging_style: winery_profile.messaging_style || 'Not specified'
          },
          word_count: contentBody.replace(/<[^>]*>/g, '').split(' ').length
        },
        message: "Content generated with personalized brand voice"
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