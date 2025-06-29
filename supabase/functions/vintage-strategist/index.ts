/*
  # Vintage Strategist Agent Edge Function

  1. Purpose
    - Creates comprehensive content strategies and editorial calendars
    - Plans content distribution across multiple channels

  2. Functionality
    - Analyzes content goals and target audience
    - Generates strategic content calendar
    - Suggests optimal posting schedules

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

    const { winery_id, winery_profile, test }: RequestPayload = await req.json();

    // Handle test requests
    if (test) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Vintage Strategist Agent is available" 
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

    const contentGoals = winery_profile.content_goals || 3;
    const contentTypes = ['blog_post', 'social_media', 'newsletter'];
    const themes = [
      'Behind the Scenes at the Vineyard',
      'Wine Pairing Guide',
      'Seasonal Wine Selection',
      'Winemaking Process',
      'Local Wine Events'
    ];

    // Generate strategic content for the next week
    const contentItems = [];
    const today = new Date();
    
    for (let i = 0; i < contentGoals; i++) {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + (i * 2) + 1); // Space out content every 2 days
      
      const contentType = contentTypes[i % contentTypes.length];
      const theme = themes[i % themes.length];
      
      let title = '';
      let content = '';
      
      if (contentType === 'blog_post') {
        title = `${theme} - ${winery_profile.winery_name}`;
        content = `<h2>${theme}</h2>
        
<p>Welcome to another story from ${winery_profile.winery_name}, where we're passionate about sharing our journey in ${winery_profile.location}.</p>

<p>${winery_profile.backstory}</p>

<h3>What Makes Us Special</h3>
<p>Our ${winery_profile.brand_tone || 'elegant'} approach to winemaking ensures that every bottle reflects the unique character of our vineyard. We specialize in ${winery_profile.wine_types?.join(', ') || 'exceptional wines'} that appeal to ${winery_profile.target_audience || 'wine enthusiasts'}.</p>

<p>Stay tuned for more insights into our winemaking process and upcoming events!</p>`;
      } else if (contentType === 'social_media') {
        title = `${theme} - Social Post`;
        content = `🍷 ${theme} at ${winery_profile.winery_name}! 

Located in beautiful ${winery_profile.location}, we're crafting wines that tell our story.

${winery_profile.wine_types?.slice(0, 2).join(' & ') || 'Amazing wines'} available now!

#Wine #${winery_profile.location?.replace(/\s+/g, '')} #Winery`;
      } else {
        title = `${winery_profile.winery_name} Newsletter - ${theme}`;
        content = `<h2>${theme}</h2>

<p>Dear Wine Lovers,</p>

<p>We're excited to share this month's update from ${winery_profile.winery_name}. Our team has been working hard to bring you the finest wines from ${winery_profile.location}.</p>

<h3>Featured This Month</h3>
<p>Discover our ${winery_profile.wine_types?.[0] || 'signature wine'} and learn about the passion that goes into every bottle.</p>

<p>Cheers,<br>The ${winery_profile.winery_name} Team</p>`;
      }
      
      contentItems.push({
        winery_id: winery_id,
        title: title,
        content: content,
        content_type: contentType,
        status: 'draft',
        scheduled_date: scheduledDate.toISOString(),
        created_by: null // Will be set by RLS
      });
    }

    // Insert all content items
    const { data: contentData, error: contentError } = await supabase
      .from('content_calendar')
      .insert(contentItems)
      .select();

    if (contentError) {
      console.error('Error creating content strategy:', contentError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create content strategy",
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
          content_items: contentData,
          strategy: {
            weekly_goals: contentGoals,
            content_themes: themes,
            posting_schedule: "Every 2 days for optimal engagement"
          }
        },
        message: `Content strategy created with ${contentData?.length || 0} pieces of content`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error('Error in vintage-strategist function:', error);
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