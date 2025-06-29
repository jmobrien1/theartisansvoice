/*
  # Real Event Engine - Production Implementation

  1. Purpose
    - Scrapes REAL local event websites for opportunities
    - Uses AI to identify wine/tourism-related events from actual data
    - NO MORE DEMO DATA - only real scraped content
    - Configurable scheduling system

  2. Functionality
    - Scrapes curated high-value event websites
    - AI analyzes real scraped content for relevant events
    - Creates research briefs for discovered events
    - Triggers content generation for all wineries
    - Supports both scheduled and manual execution

  3. Real Data Sources
    - Curated list of reliable event websites
    - Proper web scraping with error handling
    - Respects rate limiting and timeouts
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// CURATED HIGH-VALUE EVENT SOURCES - Optimized for reliability and relevance
const EVENT_SOURCES = [
  // Category 1: High-Value Regional & Primary Targets
  {
    url: 'https://www.visitloudoun.org/events/',
    name: 'Visit Loudoun Events',
    region: 'Loudoun County, VA',
    type: 'tourism',
    priority: 'high',
    description: '#1 source for DC Wine Country events - densely packed with winery/brewery events'
  },
  {
    url: 'https://www.fxva.com/events/',
    name: 'FXVA (Visit Fairfax) Events',
    region: 'Fairfax County, VA',
    type: 'tourism',
    priority: 'high',
    description: 'Large, affluent county with major festivals and venue events'
  },
  {
    url: 'https://www.virginia.org/events/',
    name: 'Virginia is for Lovers (Official State Tourism)',
    region: 'Virginia',
    type: 'tourism',
    priority: 'high',
    description: 'High-level source with largest, most significant festivals and wine/beer trails'
  },
  
  // Category 2: Specific County & Town Calendars
  {
    url: 'https://www.visitpwc.com/events/',
    name: 'Prince William County Events',
    region: 'Prince William County, VA',
    type: 'county',
    priority: 'medium',
    description: 'Official tourism site for local breweries, parks, and historic sites'
  },
  {
    url: 'https://visitfauquier.com/all-events/',
    name: 'Visit Fauquier',
    region: 'Fauquier County, VA',
    type: 'tourism',
    priority: 'medium',
    description: 'Tourism-focused site for Warrenton and Marshall area events'
  },
  {
    url: 'https://www.discoverclarkecounty.com/events',
    name: 'Discover Clarke County Events',
    region: 'Clarke County, VA',
    type: 'tourism',
    priority: 'medium',
    description: 'Main events hub focusing on outdoor activities, history, and local festivals'
  },
  
  // Category 3: Local News & Lifestyle Sources
  {
    url: 'https://northernvirginiamag.com/events/',
    name: 'Northern Virginia Magazine Events',
    region: 'Northern Virginia',
    type: 'lifestyle',
    priority: 'high',
    description: 'Curated high-end food, wine, and cultural events for target audience'
  }
];

interface EventBrief {
  event_name: string;
  event_date: string;
  event_location: string;
  event_summary: string;
  relevance_score: number;
  source_url: string;
  source_region: string;
}

interface ScrapedContent {
  url: string;
  name: string;
  region: string;
  text: string;
  success: boolean;
  error?: string;
  priority: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    console.log('🔍 Starting REAL event scan with curated sources...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Scrape Real Event Websites ---
    console.log('📡 Scraping curated local event websites...');
    
    // Sort sources by priority (high first)
    const prioritizedSources = EVENT_SOURCES.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const scrapedContents: ScrapedContent[] = await Promise.all(
      prioritizedSources.map(async (source) => {
        try {
          console.log(`Fetching: ${source.name} (${source.priority} priority)`);
          
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Cache-Control': 'max-age=0'
            },
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${source.name}: ${response.status} ${response.statusText}`);
            return { 
              url: source.url, 
              name: source.name,
              region: source.region,
              text: "", 
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
              priority: source.priority
            };
          }
          
          const text = await response.text();
          
          // Extract meaningful content from HTML
          const cleanedText = extractEventContent(text, source.type);
          
          console.log(`✅ Successfully scraped ${source.name} (${cleanedText.length} characters)`);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: cleanedText, 
            success: true,
            priority: source.priority
          };
          
        } catch (error) {
          console.error(`Error scraping ${source.name}:`, error);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: "", 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            priority: source.priority
          };
        }
      })
    );

    // Filter successful scrapes
    const successfulScrapes = scrapedContents.filter(content => content.success && content.text.length > 200);
    const highPriorityScrapes = successfulScrapes.filter(content => content.priority === 'high');
    
    console.log(`📊 Scraping results: ${successfulScrapes.length}/${EVENT_SOURCES.length} sources successful (${highPriorityScrapes.length} high-priority)`);
    
    if (successfulScrapes.length === 0) {
      console.error('❌ No successful scrapes - all event sources failed');
      return new Response(JSON.stringify({
        success: false,
        error: "No event data could be scraped from any source",
        scraped_sources: 0,
        total_sources: EVENT_SOURCES.length,
        scrape_errors: scrapedContents.map(s => ({ 
          name: s.name, 
          error: s.error || 'Unknown error' 
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Combine scraped content, prioritizing high-value sources
    const combinedText = successfulScrapes
      .sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .map(content => 
        `=== ${content.name} (${content.region}) - ${content.priority.toUpperCase()} PRIORITY ===\nSource: ${content.url}\n${content.text}`
      ).join('\n\n---\n\n');

    // --- Step 2: AI Analysis for Wine/Tourism Events ---
    console.log('🤖 Analyzing scraped content with AI for wine/tourism events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found - cannot analyze events');
      return new Response(JSON.stringify({
        success: false,
        error: "OpenAI API key not configured - cannot analyze scraped event data",
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_SOURCES.length,
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          content_length: s.text.length 
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const analysisPrompt = `You are an expert event analyst specializing in wine tourism, craft beverage marketing, and local hospitality opportunities in the Virginia/DC metro region. Analyze the following REAL scraped content from curated local event websites and extract upcoming events that would be highly relevant for wineries to create marketing content about.

PRIORITY EVENT TYPES (focus on these first):
🍷 WINE & BEVERAGE EVENTS:
- Wine festivals, tastings, or vineyard events
- Brewery tours, beer festivals, craft beverage events
- Wine & food pairings, culinary events with alcohol
- Harvest celebrations, grape stomping, winemaking events

🎉 HIGH-VALUE TOURISM EVENTS:
- Food festivals, farmers markets, farm-to-table events
- Arts & crafts festivals (wine lovers attend these)
- Music festivals, outdoor concerts (wine-friendly audiences)
- Holiday celebrations, seasonal festivals
- Cultural events, art gallery openings

🌍 COMMUNITY & LIFESTYLE EVENTS:
- Charity galas, fundraising events (affluent wine-buying demographic)
- Outdoor activities (hiking, cycling - wine tourism crossover)
- Historical society events, heritage celebrations
- Garden tours, agricultural events

EXTRACTION CRITERIA:
✅ MUST HAVE: Specific dates (not ongoing attractions)
✅ MUST BE: Within next 4 months from today (${new Date().toLocaleDateString()})
✅ MUST BE: In Virginia, DC, or Maryland region
✅ FOCUS ON: Events that attract wine enthusiasts, tourists, or affluent locals

For each relevant event, provide:
- event_name: The EXACT name from the website
- event_date: Specific date in YYYY-MM-DD format
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- relevance_score: Number from 1-10 (8+ for wine events, 6+ for tourism events, 5+ for community events)
- source_url: The website where this event was found
- source_region: The specific region/county this event is in

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Prioritize events from HIGH PRIORITY sources
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content

Today's date is ${new Date().toLocaleDateString()}.

Respond ONLY with a valid JSON object containing a single key "events", which is an array of event objects. If no relevant events are found, return {"events":[]}.

SCRAPED CONTENT TO ANALYZE:
${combinedText}`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: analysisPrompt },
            { role: 'user', content: 'Please analyze the scraped event data and extract relevant wine/tourism events.' }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      const result = JSON.parse(openaiData.choices[0]?.message?.content || '{"events":[]}');
      const events: EventBrief[] = result.events || [];

      console.log(`🎯 AI identified ${events.length} relevant events from real data`);

      if (events.length === 0) {
        console.log('ℹ️ No relevant events found in scraped content');
        return new Response(JSON.stringify({ 
          success: true,
          message: "No relevant events found in current scraped content",
          events_found: 0,
          scraped_sources: successfulScrapes.length,
          high_priority_sources: highPriorityScrapes.length,
          total_sources: EVENT_SOURCES.length,
          scrape_details: successfulScrapes.map(s => ({ 
            name: s.name, 
            region: s.region, 
            priority: s.priority,
            content_length: s.text.length 
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 3: Create Research Briefs for Real Discovered Events ---
      console.log('📝 Creating research briefs for real discovered events...');
      
      const { data: wineries, error: wineriesError } = await supabase
        .from('winery_profiles')
        .select('id, winery_name, location');

      if (wineriesError) {
        throw new Error(`Failed to fetch wineries: ${wineriesError.message}`);
      }

      if (!wineries || wineries.length === 0) {
        console.log('ℹ️ No wineries found to generate content for');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Real events found but no wineries to generate content for",
          events_found: events.length,
          events: events.map(e => ({ 
            name: e.event_name, 
            date: e.event_date, 
            relevance: e.relevance_score,
            source: e.source_region
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Generating content for ${wineries.length} wineries across ${events.length} real events`);

      let contentGeneratedCount = 0;
      let briefsCreatedCount = 0;

      // For each real event, create content for each winery
      for (const event of events) {
        for (const winery of wineries) {
          try {
            // Create a research brief specific to this winery and real event
            const wineryBrief = {
              winery_id: winery.id,
              suggested_theme: `Local Event: ${event.event_name}`,
              key_points: [
                `Event: ${event.event_name}`,
                `Date: ${event.event_date}`,
                `Location: ${event.event_location}`,
                `Summary: ${event.event_summary}`,
                `Relevance Score: ${event.relevance_score}/10`,
                `Source: ${event.source_url}`,
                `Region: ${event.source_region}`,
                `Discovered: ${new Date().toLocaleDateString()}`
              ],
              local_event_name: event.event_name,
              local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
              local_event_location: event.event_location,
              seasonal_context: `Real event discovered by Event Engine from ${event.source_region}. ${event.event_summary} This is an actual opportunity for ${winery.winery_name} to engage with the local wine community.`
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

            // Generate content based on this real event
            const contentRequest = {
              content_type: 'social_media',
              primary_topic: `Local event opportunity: ${event.event_name}`,
              key_talking_points: `${event.event_summary} Event details: ${event.event_date} at ${event.event_location}. This is a real opportunity happening in ${event.source_region} for ${winery.winery_name} to connect with the local wine community.`,
              call_to_action: 'Join us and discover exceptional wines at this exciting local event!'
            };

            // Call the generate-content function
            const { error: contentError } = await supabase.functions.invoke('generate-content', {
              body: {
                winery_id: winery.id,
                content_request: contentRequest,
                research_brief_id: newBrief.id
              }
            });

            if (contentError) {
              console.error(`Failed to generate content for ${winery.winery_name}:`, contentError);
            } else {
              contentGeneratedCount++;
              console.log(`✅ Generated content for ${winery.winery_name} - ${event.event_name}`);
            }

            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`Error processing ${event.event_name} for ${winery.winery_name}:`, error);
          }
        }
      }

      console.log(`🎉 Real Event Engine completed successfully!`);
      console.log(`📊 Results: ${briefsCreatedCount} briefs created, ${contentGeneratedCount} content pieces generated`);

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully processed ${events.length} real events for ${wineries.length} wineries`,
        data_source: 'real_events',
        events_processed: events.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: contentGeneratedCount,
        scraped_sources: successfulScrapes.length,
        high_priority_sources: highPriorityScrapes.length,
        total_sources: EVENT_SOURCES.length,
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          content_length: s.text.length 
        })),
        events: events.map(e => ({ 
          name: e.event_name, 
          date: e.event_date, 
          location: e.event_location,
          relevance: e.relevance_score,
          source: e.source_region
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (openaiError) {
      console.error('OpenAI analysis failed:', openaiError);
      return new Response(JSON.stringify({
        success: false,
        error: `AI analysis failed: ${openaiError.message}`,
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_SOURCES.length
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

// Helper function to extract meaningful event content from HTML
function extractEventContent(html: string, sourceType: string): string {
  try {
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // Remove HTML tags but keep the text content
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&/g, '&');
    cleaned = cleaned.replace(/</g, '<');
    cleaned = cleaned.replace(/>/g, '>');
    cleaned = cleaned.replace(/"/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&rsquo;/g, "'");
    cleaned = cleaned.replace(/&ldquo;/g, '"');
    cleaned = cleaned.replace(/&rdquo;/g, '"');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    // Event-related keywords for filtering
    const eventKeywords = [
      'event', 'festival', 'tasting', 'wine', 'vineyard', 'celebration',
      'concert', 'market', 'tour', 'dinner', 'pairing', 'harvest',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      '2024', '2025', 'weekend', 'saturday', 'sunday', 'friday',
      'winery', 'brewery', 'distillery', 'cellar', 'craft', 'local'
    ];
    
    const sentences = cleaned.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const keywordCount = eventKeywords.filter(keyword => lowerSentence.includes(keyword)).length;
      return keywordCount >= 1 && sentence.length > 20;
    });
    
    // Use relevant sentences if found, otherwise use first part of cleaned text
    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 100).join('. ');
    } else {
      return cleaned.substring(0, 8000);
    }
    
  } catch (error) {
    console.error('Error extracting event content:', error);
    return html.substring(0, 2000);
  }
}