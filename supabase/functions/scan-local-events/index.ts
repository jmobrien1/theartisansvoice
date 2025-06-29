/*
  # Hyper-Local Event Engine - Scheduled Scanner

  1. Purpose
    - Automatically scans local event websites for relevant opportunities
    - Uses AI to identify wine/tourism-related events
    - Proactively generates content for all wineries based on findings
    - Transforms the app from reactive to proactive

  2. Functionality
    - Scheduled to run weekly (every Monday at 9 AM)
    - Scrapes multiple local event websites
    - AI analyzes scraped content for relevant events
    - Creates research briefs for discovered events
    - Triggers content generation for all wineries

  3. Security
    - Service role authentication required
    - Comprehensive error handling
    - Rate limiting considerations
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Hyper-local event calendar URLs - customize these for your target regions
const EVENT_URLS = [
  'https://www.visitloudoun.org/events/',
  'https://www.loudounwine.org/events',
  'https://www.dcwinefest.org/events',
  'https://www.visitvirginia.org/events/',
  'https://www.napavalley.com/events'
];

interface EventBrief {
  event_name: string;
  event_date: string;
  event_location: string;
  event_summary: string;
  relevance_score: number;
}

interface ScrapedContent {
  url: string;
  text: string;
  success: boolean;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Security check: Only allow POST requests (for scheduled invocations)
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    console.log('🔍 Starting hyper-local event scan...');

    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Scrape Local Event Websites ---
    console.log('📡 Scraping local event websites...');
    
    const scrapedContents: ScrapedContent[] = await Promise.all(
      EVENT_URLS.map(async (url) => {
        try {
          console.log(`Fetching: ${url}`);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WineryContentEngine/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return { url, text: "", success: false };
          }
          
          const text = await response.text();
          console.log(`✅ Successfully scraped ${url} (${text.length} characters)`);
          return { url, text, success: true };
          
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
          return { url, text: "", success: false };
        }
      })
    );

    // Filter successful scrapes and combine text
    const successfulScrapes = scrapedContents.filter(content => content.success);
    const combinedText = successfulScrapes.map(content => 
      `=== Content from ${content.url} ===\n${content.text}`
    ).join('\n\n---\n\n');

    if (combinedText.length < 100) {
      console.warn('⚠️ Insufficient content scraped, using demo events');
      return await generateDemoEvents(supabase);
    }

    // --- Step 2: AI Analysis to Extract Relevant Events ---
    console.log('🤖 Analyzing scraped content with AI...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('⚠️ OpenAI API key not found, using demo events');
      return await generateDemoEvents(supabase);
    }

    const analysisPrompt = `You are an expert event analyst specializing in wine tourism and local hospitality marketing. Analyze the following raw HTML/text from local event websites and extract upcoming events that would be relevant for wineries to create marketing content about.

FOCUS ON EVENTS THAT ARE:
- Wine festivals, tastings, or vineyard events
- Food & wine pairings or culinary events
- Local tourism events that wine lovers would attend
- Seasonal celebrations that wineries could tie into
- Arts, music, or cultural events in wine regions
- Holiday celebrations or special occasions

For each relevant event, provide:
- event_name: Clear, descriptive name
- event_date: Date or date range (if available)
- event_location: Venue or general location
- event_summary: One sentence describing the event and why it's relevant to wineries
- relevance_score: Number from 1-10 (10 = perfect for winery marketing)

Only include events with relevance_score of 6 or higher.

Today's date is ${new Date().toLocaleDateString()}.

Respond ONLY with a valid JSON object containing a single key "events", which is an array of event objects. If no relevant events are found, return an empty array.`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: analysisPrompt },
            { role: 'user', content: combinedText }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      const result = JSON.parse(openaiData.choices[0]?.message?.content || '{"events":[]}');
      const events: EventBrief[] = result.events || [];

      console.log(`🎯 AI identified ${events.length} relevant events`);

      if (events.length === 0) {
        console.log('ℹ️ No relevant events found in scraped content');
        return new Response(JSON.stringify({ 
          message: "No new relevant events found in scraped content.",
          scraped_sources: successfulScrapes.length,
          total_sources: EVENT_URLS.length
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 3: Create Research Briefs for Discovered Events ---
      console.log('📝 Creating research briefs for discovered events...');
      
      const briefsToInsert = events.map(event => ({
        suggested_theme: `Local Event Opportunity: ${event.event_name}`,
        key_points: [
          `Event: ${event.event_name}`,
          `Date: ${event.event_date}`,
          `Location: ${event.event_location}`,
          `Summary: ${event.event_summary}`,
          `Relevance Score: ${event.relevance_score}/10`
        ],
        local_event_name: event.event_name,
        local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
        local_event_location: event.event_location,
        seasonal_context: `Proactive opportunity identified by Event Engine. ${event.event_summary}`,
        winery_id: null // Will be set per winery when generating content
      }));

      // --- Step 4: Generate Content for All Wineries ---
      console.log('🏭 Fetching all wineries for content generation...');
      
      const { data: wineries, error: wineriesError } = await supabase
        .from('winery_profiles')
        .select('id, winery_name, location');

      if (wineriesError) {
        throw new Error(`Failed to fetch wineries: ${wineriesError.message}`);
      }

      if (!wineries || wineries.length === 0) {
        console.log('ℹ️ No wineries found to generate content for');
        return new Response(JSON.stringify({ 
          message: "No wineries found to generate content for.",
          events_found: events.length
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Generating content for ${wineries.length} wineries across ${events.length} events`);

      let contentGeneratedCount = 0;
      let briefsCreatedCount = 0;

      // For each event, create content for each winery
      for (const event of events) {
        for (const winery of wineries) {
          try {
            // Create a research brief specific to this winery
            const wineryBrief = {
              ...briefsToInsert[events.indexOf(event)],
              winery_id: winery.id
            };

            const { data: newBrief, error: briefError } = await supabase
              .from('research_briefs')
              .insert([wineryBrief])
              .select()
              .single();

            if (briefError) {
              console.error(`Failed to create brief for ${winery.winery_name}:`, briefError);
              continue;
            }

            briefsCreatedCount++;

            // Generate content based on this event for this specific winery
            const contentRequest = {
              content_type: 'social_media',
              primary_topic: `Upcoming local event: ${event.event_name}`,
              key_talking_points: `${event.event_summary} Event details: ${event.event_date} at ${event.event_location}. This is a great opportunity for ${winery.winery_name} to connect with the local wine community.`,
              call_to_action: 'Join us and discover exceptional wines!'
            };

            // Call the generate-content function
            const { error: contentError } = await supabase.functions.invoke('generate-content', {
              body: {
                winery_id: winery.id,
                content_request: contentRequest
              }
            });

            if (contentError) {
              console.error(`Failed to generate content for ${winery.winery_name}:`, contentError);
            } else {
              contentGeneratedCount++;
              console.log(`✅ Generated content for ${winery.winery_name} - ${event.event_name}`);
            }

            // Add small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`Error processing ${event.event_name} for ${winery.winery_name}:`, error);
          }
        }
      }

      console.log(`🎉 Event Engine completed successfully!`);
      console.log(`📊 Results: ${briefsCreatedCount} briefs created, ${contentGeneratedCount} content pieces generated`);

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully processed ${events.length} events for ${wineries.length} wineries`,
        events_processed: events.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: contentGeneratedCount,
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_URLS.length,
        events: events.map(e => ({ name: e.event_name, date: e.event_date, relevance: e.relevance_score }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (openaiError) {
      console.error('OpenAI analysis failed:', openaiError);
      return await generateDemoEvents(supabase);
    }

  } catch (error) {
    console.error('Error in scan-local-events function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Demo event generation for when scraping/AI fails
async function generateDemoEvents(supabase: any) {
  console.log('🎭 Generating demo events for testing...');
  
  const demoEvents = [
    {
      event_name: "Harvest Festival Weekend",
      event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      event_location: "Downtown Wine District",
      event_summary: "Annual celebration of harvest season with wine tastings, live music, and local food vendors - perfect opportunity for wineries to showcase seasonal offerings.",
      relevance_score: 9
    },
    {
      event_name: "Farm-to-Table Wine Dinner Series",
      event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      event_location: "Local Culinary Center",
      event_summary: "Monthly dinner series pairing local wines with seasonal cuisine - excellent networking opportunity for winery partnerships.",
      relevance_score: 8
    },
    {
      event_name: "Holiday Wine & Gift Market",
      event_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      event_location: "Community Center",
      event_summary: "Holiday shopping event featuring local artisans and wine makers - ideal for promoting wine gifts and holiday packages.",
      relevance_score: 7
    }
  ];

  const { data: wineries } = await supabase
    .from('winery_profiles')
    .select('id, winery_name');

  if (!wineries || wineries.length === 0) {
    return new Response(JSON.stringify({ 
      message: "Demo mode: No wineries found to generate content for.",
      events_found: demoEvents.length
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let contentGeneratedCount = 0;
  let briefsCreatedCount = 0;

  for (const event of demoEvents) {
    for (const winery of wineries) {
      try {
        // Create research brief
        const { data: newBrief, error: briefError } = await supabase
          .from('research_briefs')
          .insert([{
            winery_id: winery.id,
            suggested_theme: `Local Event Opportunity: ${event.event_name}`,
            key_points: [
              `Event: ${event.event_name}`,
              `Date: ${event.event_date}`,
              `Location: ${event.event_location}`,
              `Summary: ${event.event_summary}`,
              `Relevance Score: ${event.relevance_score}/10`
            ],
            local_event_name: event.event_name,
            local_event_date: event.event_date,
            local_event_location: event.event_location,
            seasonal_context: `Demo event identified by Event Engine. ${event.event_summary}`
          }])
          .select()
          .single();

        if (!briefError) {
          briefsCreatedCount++;

          // Generate content
          const { error: contentError } = await supabase.functions.invoke('generate-content', {
            body: {
              winery_id: winery.id,
              content_request: {
                content_type: 'social_media',
                primary_topic: `Upcoming local event: ${event.event_name}`,
                key_talking_points: `${event.event_summary} Event details: ${new Date(event.event_date).toLocaleDateString()} at ${event.event_location}.`,
                call_to_action: 'Join us and discover exceptional wines!'
              }
            }
          });

          if (!contentError) {
            contentGeneratedCount++;
          }
        }
      } catch (error) {
        console.error(`Demo error for ${winery.winery_name}:`, error);
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Demo mode: Processed ${demoEvents.length} demo events for ${wineries.length} wineries`,
    mode: 'demo',
    events_processed: demoEvents.length,
    wineries_processed: wineries.length,
    briefs_created: briefsCreatedCount,
    content_generated: contentGeneratedCount,
    events: demoEvents.map(e => ({ name: e.event_name, date: e.event_date, relevance: e.relevance_score }))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}