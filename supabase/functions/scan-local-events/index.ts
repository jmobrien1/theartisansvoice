/*
  # Comprehensive Event Engine - All RSS Feeds + Curated Sources

  1. Purpose
    - Uses ALL available RSS feeds for maximum structured data
    - Comprehensive coverage of Northern Virginia wine/tourism events
    - Prioritizes RSS feeds over HTML scraping for reliability
    - Provides event links for users to visit for details

  2. Data Sources
    - Category 1: RSS Feeds (Gold Standard - Structured Data)
    - Category 2: High-Value HTML Sources (Fallback)
    - Category 3: County Sources (Local Coverage)

  3. Enhanced Features
    - Smart source prioritization (RSS first, then by priority)
    - Event URL extraction and construction
    - Comprehensive error handling and reporting
    - Real-time progress tracking
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// COMPREHENSIVE EVENT SOURCES - All RSS feeds + curated HTML sources
const EVENT_SOURCES = [
  // === CATEGORY 1: RSS FEEDS (GOLD STANDARD) ===
  {
    url: 'https://www.visitloudoun.org/event/rss/',
    name: 'Visit Loudoun Events RSS',
    region: 'Loudoun County, VA',
    type: 'rss',
    priority: 'high',
    description: '#1 source for DC Wine Country events - RSS feed with structured data'
  },
  {
    url: 'https://www.fxva.com/rss/',
    name: 'FXVA (Visit Fairfax) RSS',
    region: 'Fairfax County, VA',
    type: 'rss',
    priority: 'high',
    description: 'Large, affluent county RSS feed with major festivals and venue events'
  },
  {
    url: 'https://www.virginia.org/feeds/events/',
    name: 'Virginia is for Lovers Events RSS',
    region: 'Virginia',
    type: 'rss',
    priority: 'high',
    description: 'Official state tourism RSS with largest festivals and wine/beer trails'
  },
  {
    url: 'https://www.visitpwc.com/events/rss',
    name: 'Prince William County Events RSS',
    region: 'Prince William County, VA',
    type: 'rss',
    priority: 'medium',
    description: 'Official tourism RSS for local breweries, parks, and historic sites'
  },
  {
    url: 'https://visitfauquier.com/all-events/feed/',
    name: 'Visit Fauquier Events RSS',
    region: 'Fauquier County, VA',
    type: 'rss',
    priority: 'medium',
    description: 'Tourism-focused RSS for Warrenton and Marshall area events'
  },
  {
    url: 'https://northernvirginiamag.com/events/feed/',
    name: 'Northern Virginia Magazine Events RSS',
    region: 'Northern Virginia',
    type: 'rss',
    priority: 'high',
    description: 'Curated high-end food, wine, and cultural events RSS feed'
  },
  {
    url: 'https://www.discoverclarkecounty.com/events/feed/',
    name: 'Discover Clarke County Events RSS',
    region: 'Clarke County, VA',
    type: 'rss',
    priority: 'medium',
    description: 'Clarke County tourism RSS with outdoor activities and local festivals'
  },
  
  // === CATEGORY 2: HIGH-VALUE HTML SOURCES (FALLBACK) ===
  {
    url: 'https://www.fxva.com/events/',
    name: 'FXVA (Visit Fairfax) Events HTML',
    region: 'Fairfax County, VA',
    type: 'html',
    priority: 'high',
    description: 'Fallback HTML source for Fairfax events if RSS fails'
  },
  {
    url: 'https://www.virginia.org/events/',
    name: 'Virginia is for Lovers Events HTML',
    region: 'Virginia',
    type: 'html',
    priority: 'high',
    description: 'Fallback HTML source for state tourism events if RSS fails'
  },
  
  // === CATEGORY 3: COUNTY SOURCES (LOCAL COVERAGE) ===
  {
    url: 'https://www.fauquiercounty.gov/government/calendar',
    name: 'Fauquier County Government Calendar',
    region: 'Fauquier County, VA',
    type: 'html',
    priority: 'medium',
    description: 'Official government calendar with community events and farmers markets'
  },
  {
    url: 'https://www.warrencountyva.gov/events',
    name: 'Warren County Events',
    region: 'Warren County, VA',
    type: 'html',
    priority: 'medium',
    description: 'Official county calendar including Front Royal area events'
  }
];

interface EventBrief {
  event_name: string;
  event_date: string;
  event_location: string;
  event_summary: string;
  event_url: string;
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
  type: string;
  content_length: number;
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

    console.log('🚀 Starting COMPREHENSIVE event scan with ALL RSS feeds and curated sources...');
    console.log(`📊 Total sources configured: ${EVENT_SOURCES.length}`);
    
    const rssSources = EVENT_SOURCES.filter(s => s.type === 'rss');
    const htmlSources = EVENT_SOURCES.filter(s => s.type === 'html');
    const highPrioritySources = EVENT_SOURCES.filter(s => s.priority === 'high');
    
    console.log(`📰 RSS feeds: ${rssSources.length}, HTML sources: ${htmlSources.length}, High priority: ${highPrioritySources.length}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Fetch Event Data (RSS + HTML) ---
    console.log('📡 Fetching event data from ALL RSS feeds and curated websites...');
    
    // Sort sources by priority (RSS first, then high priority, then medium)
    const prioritizedSources = EVENT_SOURCES.sort((a, b) => {
      // RSS feeds always come first
      if (a.type === 'rss' && b.type !== 'rss') return -1;
      if (a.type !== 'rss' && b.type === 'rss') return 1;
      
      // Then by priority level
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const scrapedContents: ScrapedContent[] = await Promise.all(
      prioritizedSources.map(async (source, index) => {
        try {
          console.log(`[${index + 1}/${EVENT_SOURCES.length}] Fetching: ${source.name} (${source.type.toUpperCase()}, ${source.priority} priority)`);
          
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': source.type === 'rss' ? 
                'application/rss+xml, application/xml, text/xml, application/atom+xml' : 
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
            signal: AbortSignal.timeout(20000) // 20 second timeout for comprehensive scan
          });
          
          if (!response.ok) {
            console.warn(`❌ Failed to fetch ${source.name}: ${response.status} ${response.statusText}`);
            return { 
              url: source.url, 
              name: source.name,
              region: source.region,
              text: "", 
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
              priority: source.priority,
              type: source.type,
              content_length: 0
            };
          }
          
          const text = await response.text();
          
          // Process content based on type
          let cleanedText = '';
          if (source.type === 'rss') {
            cleanedText = extractRSSContent(text, source);
          } else {
            cleanedText = extractEventContent(text, source.type);
          }
          
          console.log(`✅ Successfully fetched ${source.name} (${cleanedText.length} characters, ${source.type.toUpperCase()})`);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: cleanedText, 
            success: true,
            priority: source.priority,
            type: source.type,
            content_length: cleanedText.length
          };
          
        } catch (error) {
          console.error(`❌ Error fetching ${source.name}:`, error);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: "", 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            priority: source.priority,
            type: source.type,
            content_length: 0
          };
        }
      })
    );

    // Analyze fetch results
    const successfulScrapes = scrapedContents.filter(content => content.success && content.text.length > 200);
    const successfulRSS = successfulScrapes.filter(content => content.type === 'rss');
    const successfulHTML = successfulScrapes.filter(content => content.type === 'html');
    const highPrioritySuccess = successfulScrapes.filter(content => content.priority === 'high');
    
    console.log(`📊 COMPREHENSIVE FETCH RESULTS:`);
    console.log(`   Total sources: ${EVENT_SOURCES.length}`);
    console.log(`   Successful: ${successfulScrapes.length} (${Math.round(successfulScrapes.length/EVENT_SOURCES.length*100)}%)`);
    console.log(`   RSS feeds successful: ${successfulRSS.length}/${rssSources.length}`);
    console.log(`   HTML sources successful: ${successfulHTML.length}/${htmlSources.length}`);
    console.log(`   High priority successful: ${highPrioritySuccess.length}/${highPrioritySources.length}`);
    
    // Log detailed results
    successfulScrapes.forEach(content => {
      console.log(`   ✅ ${content.name}: ${content.content_length} chars (${content.type.toUpperCase()}, ${content.priority})`);
    });
    
    scrapedContents.filter(content => !content.success).forEach(content => {
      console.log(`   ❌ ${content.name}: ${content.error} (${content.type.toUpperCase()}, ${content.priority})`);
    });
    
    if (successfulScrapes.length === 0) {
      console.error('❌ CRITICAL: No successful fetches - all event sources failed');
      return new Response(JSON.stringify({
        success: false,
        error: "No event data could be fetched from any source",
        scraped_sources: 0,
        total_sources: EVENT_SOURCES.length,
        rss_sources_attempted: rssSources.length,
        html_sources_attempted: htmlSources.length,
        scrape_errors: scrapedContents.map(s => ({ 
          name: s.name, 
          type: s.type,
          priority: s.priority,
          error: s.error || 'Unknown error' 
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Combine content with smart prioritization
    const combinedText = successfulScrapes
      .sort((a, b) => {
        // RSS feeds first (most reliable)
        if (a.type === 'rss' && b.type !== 'rss') return -1;
        if (a.type !== 'rss' && b.type === 'rss') return 1;
        
        // Then by priority level
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by content length (more content = potentially more events)
        return b.content_length - a.content_length;
      })
      .map(content => 
        `=== ${content.name} (${content.region}) ===
SOURCE TYPE: ${content.type.toUpperCase()} (${content.priority.toUpperCase()} PRIORITY)
SOURCE URL: ${content.url}
CONTENT LENGTH: ${content.content_length} characters
REGION: ${content.region}

${content.text}

=== END ${content.name} ===`
      ).join('\n\n---\n\n');

    console.log(`📝 Combined content from ${successfulScrapes.length} sources: ${combinedText.length} total characters`);

    // --- Step 2: AI Analysis for Wine/Tourism Events ---
    console.log('🤖 Analyzing comprehensive event data with AI for wine/tourism events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found - cannot analyze events');
      return new Response(JSON.stringify({
        success: false,
        error: "OpenAI API key not configured - cannot analyze event data",
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_SOURCES.length,
        rss_sources_successful: successfulRSS.length,
        html_sources_successful: successfulHTML.length,
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          type: s.type,
          content_length: s.content_length 
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const analysisPrompt = `You are an expert event analyst specializing in wine tourism, craft beverage marketing, and local hospitality opportunities in the Virginia/DC metro region. 

You have been provided with COMPREHENSIVE REAL EVENT DATA from ${successfulScrapes.length} sources including:
- ${successfulRSS.length} RSS feeds (structured data)
- ${successfulHTML.length} HTML websites (scraped data)
- Coverage across: ${[...new Set(successfulScrapes.map(s => s.region))].join(', ')}

PRIORITY EVENT TYPES (focus on these first):
🍷 WINE & BEVERAGE EVENTS (HIGHEST PRIORITY):
- Wine festivals, tastings, vineyard events, winery tours
- Brewery tours, beer festivals, craft beverage events
- Wine & food pairings, culinary events with alcohol
- Harvest celebrations, grape stomping, winemaking events
- Distillery events, spirits tastings

🎉 HIGH-VALUE TOURISM EVENTS:
- Food festivals, farmers markets, farm-to-table events
- Arts & crafts festivals (wine lovers attend these)
- Music festivals, outdoor concerts (wine-friendly audiences)
- Holiday celebrations, seasonal festivals
- Cultural events, art gallery openings, museum events

🌍 COMMUNITY & LIFESTYLE EVENTS:
- Charity galas, fundraising events (affluent wine-buying demographic)
- Outdoor activities (hiking, cycling - wine tourism crossover)
- Historical society events, heritage celebrations
- Garden tours, agricultural events, county fairs

EXTRACTION CRITERIA:
✅ MUST HAVE: Specific dates (not ongoing attractions)
✅ MUST BE: Within next 6 months from today (${new Date().toLocaleDateString()})
✅ MUST BE: In Virginia, DC, Maryland, or nearby regions
✅ FOCUS ON: Events that attract wine enthusiasts, tourists, or affluent locals
✅ PRIORITIZE: Events from RSS feeds (more reliable data)

For each relevant event, provide:
- event_name: The EXACT name from the source
- event_date: Specific date in YYYY-MM-DD format (if available)
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- event_url: The direct link to the event page (extract from RSS <link> tags or construct from website URLs)
- relevance_score: Number from 1-10 (9-10 for wine events, 7-8 for food/tourism events, 6-7 for community events)
- source_url: The website/RSS feed where this event was found
- source_region: The specific region/county this event is in

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Prioritize events from RSS feeds (more reliable data)
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content
- ALWAYS try to extract or construct the event_url for users to visit
- For RSS feeds, look for <link> tags within <item> elements
- For HTML sources, construct logical URLs based on the source website structure

URL EXTRACTION GUIDELINES:
- RSS feeds: Look for <link>URL</link> within each <item>
- HTML sources: Construct URLs like: [base_url]/event/[event-slug] or [base_url]/events/[event-name]
- If no specific URL found, use the source URL as fallback

Today's date is ${new Date().toLocaleDateString()}.

Respond ONLY with a valid JSON object containing a single key "events", which is an array of event objects. If no relevant events are found, return {"events":[]}.

COMPREHENSIVE EVENT DATA TO ANALYZE:
${combinedText}`;

    try {
      console.log('🔄 Sending comprehensive data to OpenAI for analysis...');
      
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
            { role: 'user', content: 'Please analyze the comprehensive event data and extract relevant wine/tourism events with their URLs.' }
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

      console.log(`🎯 AI identified ${events.length} relevant events from comprehensive data analysis`);
      
      // Log event details
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_name} (Score: ${event.relevance_score}/10, ${event.source_region})`);
        if (event.event_url) {
          console.log(`      URL: ${event.event_url}`);
        }
      });

      if (events.length === 0) {
        console.log('ℹ️ No relevant events found in comprehensive fetched content');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Comprehensive scan completed - no relevant events found in current data",
          events_found: 0,
          scraped_sources: successfulScrapes.length,
          rss_sources: successfulRSS.length,
          html_sources: successfulHTML.length,
          high_priority_sources: highPrioritySuccess.length,
          total_sources: EVENT_SOURCES.length,
          coverage_regions: [...new Set(successfulScrapes.map(s => s.region))],
          scrape_details: successfulScrapes.map(s => ({ 
            name: s.name, 
            region: s.region, 
            priority: s.priority,
            type: s.type,
            content_length: s.content_length 
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 3: Create Research Briefs for Real Discovered Events ---
      console.log('📝 Creating research briefs for comprehensive discovered events...');
      
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
          message: "Comprehensive events found but no wineries to generate content for",
          events_found: events.length,
          events: events.map(e => ({ 
            name: e.event_name, 
            date: e.event_date, 
            relevance: e.relevance_score,
            source: e.source_region,
            url: e.event_url
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Generating content for ${wineries.length} wineries across ${events.length} comprehensive events`);

      let contentGeneratedCount = 0;
      let briefsCreatedCount = 0;

      // For each comprehensive event, create content for each winery
      for (const event of events) {
        console.log(`📅 Processing event: ${event.event_name} (${event.source_region})`);
        
        for (const winery of wineries) {
          try {
            // Create a research brief specific to this winery and comprehensive event
            const wineryBrief = {
              winery_id: winery.id,
              suggested_theme: `Local Event Opportunity: ${event.event_name}`,
              key_points: [
                `Event: ${event.event_name}`,
                `Date: ${event.event_date || 'Date TBD'}`,
                `Location: ${event.event_location}`,
                `Summary: ${event.event_summary}`,
                `Event URL: ${event.event_url}`,
                `Relevance Score: ${event.relevance_score}/10`,
                `Source: ${event.source_url}`,
                `Region: ${event.source_region}`,
                `Discovered: ${new Date().toLocaleDateString()}`,
                `Data Source: Comprehensive RSS + HTML scan`
              ],
              local_event_name: event.event_name,
              local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
              local_event_location: event.event_location,
              seasonal_context: `REAL EVENT discovered by comprehensive Event Engine scan from ${event.source_region}. ${event.event_summary} This is an actual opportunity for ${winery.winery_name} to engage with the local wine community and create relevant marketing content. Event details and registration: ${event.event_url}`
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

            // Generate content based on this comprehensive event
            const contentRequest = {
              content_type: 'social_media',
              primary_topic: `Local event opportunity: ${event.event_name}`,
              key_talking_points: `${event.event_summary} Event details: ${event.event_date || 'Date TBD'} at ${event.event_location}. This is a real opportunity happening in ${event.source_region} for ${winery.winery_name} to connect with the local wine community. Learn more and register: ${event.event_url}`,
              call_to_action: `Join us and discover exceptional wines at this exciting local event! Details and registration: ${event.event_url}`
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
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`Error processing ${event.event_name} for ${winery.winery_name}:`, error);
          }
        }
      }

      console.log(`🎉 COMPREHENSIVE Event Engine completed successfully!`);
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   Sources fetched: ${successfulScrapes.length}/${EVENT_SOURCES.length} (${Math.round(successfulScrapes.length/EVENT_SOURCES.length*100)}%)`);
      console.log(`   RSS feeds: ${successfulRSS.length}/${rssSources.length}`);
      console.log(`   HTML sources: ${successfulHTML.length}/${htmlSources.length}`);
      console.log(`   Events discovered: ${events.length}`);
      console.log(`   Briefs created: ${briefsCreatedCount}`);
      console.log(`   Content generated: ${contentGeneratedCount}`);

      return new Response(JSON.stringify({
        success: true,
        message: `Comprehensive scan: processed ${events.length} real events from ${successfulScrapes.length} sources for ${wineries.length} wineries`,
        data_source: 'comprehensive_rss_html_scan',
        events_processed: events.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: contentGeneratedCount,
        scraped_sources: successfulScrapes.length,
        rss_sources_successful: successfulRSS.length,
        html_sources_successful: successfulHTML.length,
        high_priority_sources: highPrioritySuccess.length,
        total_sources: EVENT_SOURCES.length,
        coverage_regions: [...new Set(successfulScrapes.map(s => s.region))],
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          type: s.type,
          content_length: s.content_length 
        })),
        events: events.map(e => ({ 
          name: e.event_name, 
          date: e.event_date, 
          location: e.event_location,
          relevance: e.relevance_score,
          source: e.source_region,
          url: e.event_url
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
        total_sources: EVENT_SOURCES.length,
        rss_sources_successful: successfulRSS.length,
        html_sources_successful: successfulHTML.length
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in comprehensive scan-local-events function:', error);
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

// Enhanced RSS content extraction with better URL handling
function extractRSSContent(rssXml: string, source: any): string {
  try {
    console.log(`📰 Processing RSS feed from ${source.name} (${source.region})`);
    
    // Extract RSS items using regex (simple XML parsing)
    const itemMatches = rssXml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    let extractedContent = `RSS Feed from ${source.name} (${source.region})\nFeed URL: ${source.url}\n\n`;
    
    itemMatches.forEach((item, index) => {
      if (index >= 25) return; // Limit to first 25 items for comprehensive coverage
      
      // Extract title
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      
      // Extract description
      const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i);
      const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
      
      // Extract link
      const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : '';
      
      // Extract date
      const dateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      const pubDate = dateMatch ? dateMatch[1].trim() : '';
      
      // Extract additional fields that might contain URLs or event info
      const guidMatch = item.match(/<guid[^>]*>(.*?)<\/guid>/i);
      const guid = guidMatch ? guidMatch[1].trim() : '';
      
      // Clean up HTML entities and tags
      const cleanTitle = title.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      const cleanDescription = description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      
      if (cleanTitle) {
        extractedContent += `EVENT: ${cleanTitle}\n`;
        if (pubDate) extractedContent += `DATE: ${pubDate}\n`;
        if (link) extractedContent += `URL: ${link}\n`;
        if (guid && guid !== link) extractedContent += `GUID: ${guid}\n`;
        if (cleanDescription) extractedContent += `DESCRIPTION: ${cleanDescription}\n`;
        extractedContent += `SOURCE: ${source.name} RSS Feed\n`;
        extractedContent += `REGION: ${source.region}\n`;
        extractedContent += `---\n\n`;
      }
    });
    
    console.log(`✅ Extracted ${itemMatches.length} RSS items from ${source.name}`);
    return extractedContent;
    
  } catch (error) {
    console.error(`Error parsing RSS from ${source.name}:`, error);
    // Fallback to treating as regular text
    return `RSS Feed Error from ${source.name}: ${rssXml.substring(0, 8000)}`;
  }
}

// Enhanced HTML content extraction with better event detection
function extractEventContent(html: string, sourceType: string): string {
  try {
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/gi, '');
    
    // Remove HTML tags but keep the text content
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&rsquo;/g, "'");
    cleaned = cleaned.replace(/&ldquo;/g, '"');
    cleaned = cleaned.replace(/&rdquo;/g, '"');
    cleaned = cleaned.replace(/&mdash;/g, '—');
    cleaned = cleaned.replace(/&ndash;/g, '–');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    // Enhanced event-related keywords for better filtering
    const eventKeywords = [
      // Event types
      'event', 'festival', 'tasting', 'wine', 'vineyard', 'celebration', 'concert', 'market', 'tour', 'dinner', 'pairing', 'harvest',
      'brewery', 'distillery', 'cellar', 'craft', 'local', 'fair', 'expo', 'show', 'gala', 'fundraiser',
      
      // Time indicators
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      '2024', '2025', 'weekend', 'saturday', 'sunday', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday',
      'upcoming', 'annual', 'monthly', 'weekly', 'daily',
      
      // Location indicators
      'virginia', 'loudoun', 'fairfax', 'fauquier', 'clarke', 'warren', 'prince william', 'dc', 'maryland',
      'county', 'park', 'center', 'hall', 'venue', 'location',
      
      // Wine/tourism specific
      'winery', 'vineyard', 'tasting room', 'cellar door', 'sommelier', 'viticulture', 'terroir',
      'tourism', 'visitor', 'guest', 'experience', 'attraction'
    ];
    
    const sentences = cleaned.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const keywordCount = eventKeywords.filter(keyword => lowerSentence.includes(keyword)).length;
      return keywordCount >= 2 && sentence.length > 30 && sentence.length < 500;
    });
    
    // Use relevant sentences if found, otherwise use first part of cleaned text
    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 150).join('. ') + '.';
    } else {
      return cleaned.substring(0, 12000);
    }
    
  } catch (error) {
    console.error('Error extracting event content:', error);
    return html.substring(0, 5000);
  }
}