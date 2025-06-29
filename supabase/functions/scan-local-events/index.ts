/*
  # Comprehensive Event Engine - Fixed Version

  1. Purpose
    - Pulls from ALL RSS sources (not just Visit Loudoun)
    - Finds events for the NEXT 3 MONTHS (not past events)
    - Creates research briefs WITHOUT automatic content generation
    - Allows users to select which events to create content for

  2. Two-Step AI Process
    - Step 1: Extract all potential events from RSS/HTML data
    - Step 2: AI "Gatekeeper" filters out competitor events, keeps good opportunities

  3. Enhanced Features
    - Date filtering for future events only
    - No automatic content generation
    - Event URL extraction for user access
    - Comprehensive source coverage
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

interface PotentialEvent {
  title: string;
  description: string;
  link: string;
  published: string;
  location?: string;
  source_name: string;
  source_region: string;
  event_date?: string;
}

interface FilteredEvent {
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
  events_extracted?: PotentialEvent[];
}

// Helper function to check if an event is in the future (next 3 months)
function isEventInFuture(eventDateStr: string): boolean {
  try {
    const eventDate = new Date(eventDateStr);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    // Event must be after today and within the next 3 months
    return eventDate > now && eventDate <= threeMonthsFromNow;
  } catch {
    return false;
  }
}

// Helper function to extract and parse dates from event text
function extractEventDate(title: string, description: string, pubDate: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  // Current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Month patterns
  const monthPatterns = [
    { pattern: /january|jan\.?/g, month: 0 },
    { pattern: /february|feb\.?/g, month: 1 },
    { pattern: /march|mar\.?/g, month: 2 },
    { pattern: /april|apr\.?/g, month: 3 },
    { pattern: /may/g, month: 4 },
    { pattern: /june|jun\.?/g, month: 5 },
    { pattern: /july|jul\.?/g, month: 6 },
    { pattern: /august|aug\.?/g, month: 7 },
    { pattern: /september|sept?\.?/g, month: 8 },
    { pattern: /october|oct\.?/g, month: 9 },
    { pattern: /november|nov\.?/g, month: 10 },
    { pattern: /december|dec\.?/g, month: 11 }
  ];
  
  // Try to find month and day patterns
  for (const monthInfo of monthPatterns) {
    if (monthInfo.pattern.test(text)) {
      // Look for day numbers near the month
      const dayMatch = text.match(new RegExp(`${monthInfo.pattern.source}\\s*(\\d{1,2})`, 'i'));
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          // Determine year (current or next based on if the date has passed)
          const testDate = new Date(currentYear, monthInfo.month, day);
          const year = testDate < new Date() ? nextYear : currentYear;
          
          const eventDate = new Date(year, monthInfo.month, day);
          return eventDate.toISOString();
        }
      }
    }
  }
  
  // Try to parse the pubDate if available
  if (pubDate) {
    try {
      const date = new Date(pubDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return null;
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

    console.log('🚀 Starting COMPREHENSIVE event scan for FUTURE EVENTS (next 3 months)...');
    console.log(`📊 Total sources configured: ${EVENT_SOURCES.length}`);
    
    const rssSources = EVENT_SOURCES.filter(s => s.type === 'rss');
    const htmlSources = EVENT_SOURCES.filter(s => s.type === 'html');
    const highPrioritySources = EVENT_SOURCES.filter(s => s.priority === 'high');
    
    console.log(`📰 RSS feeds: ${rssSources.length}, HTML sources: ${htmlSources.length}, High priority: ${highPrioritySources.length}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Fetch Event Data from ALL Sources ---
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
            signal: AbortSignal.timeout(20000) // 20 second timeout
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
          
          // Process content based on type and extract structured events
          let extractedEvents: PotentialEvent[] = [];
          let cleanedText = '';
          
          if (source.type === 'rss') {
            const rssResult = extractRSSEvents(text, source);
            extractedEvents = rssResult.events;
            cleanedText = rssResult.text;
          } else {
            const htmlResult = extractHTMLEvents(text, source);
            extractedEvents = htmlResult.events;
            cleanedText = htmlResult.text;
          }
          
          // Filter for future events only (next 3 months)
          const futureEvents = extractedEvents.filter(event => {
            if (event.event_date) {
              return isEventInFuture(event.event_date);
            }
            // If no specific date, keep it for AI analysis
            return true;
          });
          
          console.log(`✅ Successfully fetched ${source.name}: ${extractedEvents.length} total events, ${futureEvents.length} future events (${cleanedText.length} chars, ${source.type.toUpperCase()})`);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: cleanedText, 
            success: true,
            priority: source.priority,
            type: source.type,
            content_length: cleanedText.length,
            events_extracted: futureEvents
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
    const successfulScrapes = scrapedContents.filter(content => content.success && content.events_extracted && content.events_extracted.length > 0);
    const successfulRSS = successfulScrapes.filter(content => content.type === 'rss');
    const successfulHTML = successfulScrapes.filter(content => content.type === 'html');
    
    console.log(`📊 COMPREHENSIVE FETCH RESULTS:`);
    console.log(`   Total sources: ${EVENT_SOURCES.length}`);
    console.log(`   Successful with future events: ${successfulScrapes.length}`);
    console.log(`   RSS feeds with future events: ${successfulRSS.length}/${rssSources.length}`);
    console.log(`   HTML sources with future events: ${successfulHTML.length}/${htmlSources.length}`);
    
    // Log which sources were successful
    successfulScrapes.forEach(content => {
      console.log(`   ✅ ${content.name}: ${content.events_extracted?.length || 0} future events`);
    });
    
    // Combine all extracted future events
    const allPotentialEvents: PotentialEvent[] = [];
    successfulScrapes.forEach(content => {
      if (content.events_extracted) {
        allPotentialEvents.push(...content.events_extracted);
      }
    });
    
    console.log(`🎯 Total potential FUTURE events extracted: ${allPotentialEvents.length}`);
    
    if (allPotentialEvents.length === 0) {
      console.error('❌ CRITICAL: No future events extracted from any source');
      return new Response(JSON.stringify({
        success: false,
        error: "No future events could be extracted from any source",
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_SOURCES.length,
        rss_sources_successful: successfulRSS.length,
        html_sources_successful: successfulHTML.length,
        source_details: successfulScrapes.map(s => ({
          name: s.name,
          type: s.type,
          events_found: s.events_extracted?.length || 0
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Step 2: AI "Gatekeeper" to Filter Out Competitor Events ---
    console.log('🛡️ Running AI GATEKEEPER to filter out competitor events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found - cannot run gatekeeper analysis');
      return new Response(JSON.stringify({
        success: false,
        error: "OpenAI API key not configured - cannot filter events",
        potential_events_found: allPotentialEvents.length,
        scraped_sources: successfulScrapes.length
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const gatekeeperPrompt = `You are a savvy local marketing strategist for boutique Virginia craft beverage brands. Your job is to analyze a list of FUTURE events (next 3 months) and identify ONLY the events that are good, non-competitive marketing opportunities.

CRITICAL FILTERING RULES:

✅ GOOD EVENTS (INCLUDE THESE):
- Large community festivals (e.g., "Leesburg Flower & Garden Festival", "Loudoun County Fair")
- General interest events (e.g., "Classic Car Show", "Fall Farm Tour", "Art Festival")
- Holiday-themed events or general tourism drivers
- Food festivals, farmers markets, culinary events (without specific winery/brewery focus)
- Cultural events, concerts, art shows, museum events
- Charity galas, fundraising events
- Outdoor activities (hiking events, cycling tours, garden tours)
- County fairs, agricultural events, heritage celebrations

❌ BAD EVENTS (EXCLUDE THESE):
- Events hosted by a single, competing winery, brewery, or cidery (e.g., "Corcoran Vineyards Summer Music Series", "Vanish Brewery's Anniversary Party", "Bold Rock Cidery Harvest Festival")
- Tastings, release parties, or happy hours at a specific competitor
- Wine club events, winery-specific celebrations
- Brewery tours, distillery events hosted by competitors
- Any event where the primary host is a direct competitor in the craft beverage space

ANALYSIS INSTRUCTIONS:
1. Look at the event title and description carefully
2. If it mentions a specific winery, brewery, cidery, or distillery name as the host/organizer, EXCLUDE it
3. If it's a general community event that happens to be AT a venue but isn't hosted BY that venue, INCLUDE it
4. Focus on events that would attract wine-buying demographics but aren't competitive
5. Only include events that are clearly in the FUTURE (not past events)

Respond ONLY with a valid JSON object with a single key "relevant_events", which is an array of the event objects that passed your filter. Keep all original fields for events that pass. If no events are relevant, return {"relevant_events":[]}.

FUTURE EVENTS TO ANALYZE:
${JSON.stringify(allPotentialEvents)}`;

    try {
      console.log('🔄 Sending future events to AI Gatekeeper for competitor filtering...');
      
      const gatekeeperResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: gatekeeperPrompt },
            { role: 'user', content: 'Please analyze the future events and filter out competitor events, keeping only good marketing opportunities.' }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!gatekeeperResponse.ok) {
        const errorData = await gatekeeperResponse.json();
        throw new Error(`OpenAI Gatekeeper error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const gatekeeperData = await gatekeeperResponse.json();
      const gatekeeperResult = JSON.parse(gatekeeperData.choices[0]?.message?.content || '{"relevant_events":[]}');
      const filteredEvents: PotentialEvent[] = gatekeeperResult.relevant_events || [];

      console.log(`🛡️ GATEKEEPER RESULTS:`);
      console.log(`   Future events before filtering: ${allPotentialEvents.length}`);
      console.log(`   Future events after filtering: ${filteredEvents.length}`);
      console.log(`   Competitor events filtered out: ${allPotentialEvents.length - filteredEvents.length}`);

      if (filteredEvents.length === 0) {
        console.log('ℹ️ No relevant non-competitor future events found after gatekeeper filtering');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Gatekeeper completed - no relevant non-competitor future events found",
          events_before_filtering: allPotentialEvents.length,
          events_after_filtering: 0,
          competitor_events_filtered: allPotentialEvents.length,
          scraped_sources: successfulScrapes.length
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 3: Enhanced Analysis of Filtered Future Events ---
      console.log('🤖 Running enhanced analysis on filtered non-competitor future events...');
      
      const today = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(today.getMonth() + 3);
      
      const enhancedAnalysisPrompt = `You are an expert event analyst specializing in wine tourism and craft beverage marketing opportunities in Virginia. 

You have been provided with ${filteredEvents.length} PRE-FILTERED future events that have already passed the competitor screening. These are confirmed to be NON-COMPETITIVE events that could be good marketing opportunities.

IMPORTANT: Today's date is ${today.toLocaleDateString()}. Only analyze events that are clearly in the FUTURE (between now and ${threeMonthsFromNow.toLocaleDateString()}).

Your task is to analyze these filtered future events and provide enhanced details for each one, focusing on wine tourism and marketing potential.

For each FUTURE event, provide:
- event_name: The EXACT name from the source
- event_date: Specific date in YYYY-MM-DD format (must be in the future, between ${today.toISOString().split('T')[0]} and ${threeMonthsFromNow.toISOString().split('T')[0]})
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- event_url: The direct link to the event page (use the provided link field)
- relevance_score: Number from 6-10 (8-10 for food/tourism events, 6-7 for general community events)
- source_url: The website where this event was found
- source_region: The specific region/county this event is in

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Only include events that are clearly in the FUTURE (not past events)
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content
- Provide specific, actionable event summaries
- Ensure event_url is properly formatted

Respond ONLY with a valid JSON object containing a single key "events", which is an array of enhanced event objects.

FILTERED NON-COMPETITOR FUTURE EVENTS TO ANALYZE:
${JSON.stringify(filteredEvents)}`;

      const enhancedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: enhancedAnalysisPrompt },
            { role: 'user', content: 'Please provide enhanced analysis of these filtered future events.' }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!enhancedResponse.ok) {
        const errorData = await enhancedResponse.json();
        throw new Error(`OpenAI Enhanced Analysis error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const enhancedData = await enhancedResponse.json();
      const enhancedResult = JSON.parse(enhancedData.choices[0]?.message?.content || '{"events":[]}');
      const finalEvents: FilteredEvent[] = enhancedResult.events || [];

      console.log(`🎯 FINAL ANALYSIS RESULTS:`);
      console.log(`   Enhanced future events: ${finalEvents.length}`);
      
      // Log event details
      finalEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_name} (Score: ${event.relevance_score}/10, ${event.event_date}, ${event.source_region})`);
        if (event.event_url) {
          console.log(`      URL: ${event.event_url}`);
        }
      });

      if (finalEvents.length === 0) {
        console.log('ℹ️ No future events passed final enhanced analysis');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Analysis completed - no future events met final quality standards",
          events_before_filtering: allPotentialEvents.length,
          events_after_gatekeeper: filteredEvents.length,
          events_final: 0,
          scraped_sources: successfulScrapes.length
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 4: Create Research Briefs for Final Future Events (NO AUTOMATIC CONTENT GENERATION) ---
      console.log('📝 Creating research briefs for final filtered future events (NO automatic content generation)...');
      
      const { data: wineries, error: wineriesError } = await supabase
        .from('winery_profiles')
        .select('id, winery_name, location');

      if (wineriesError) {
        throw new Error(`Failed to fetch wineries: ${wineriesError.message}`);
      }

      if (!wineries || wineries.length === 0) {
        console.log('ℹ️ No wineries found to generate briefs for');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Future events found but no wineries to generate briefs for",
          events_found: finalEvents.length,
          events: finalEvents.map(e => ({ 
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

      console.log(`🎯 Creating research briefs for ${wineries.length} wineries across ${finalEvents.length} filtered future events`);

      let briefsCreatedCount = 0;

      // For each final future event, create research briefs for each winery (NO CONTENT GENERATION)
      for (const event of finalEvents) {
        console.log(`📅 Processing filtered future event: ${event.event_name} (${event.event_date}, ${event.source_region})`);
        
        for (const winery of wineries) {
          try {
            // Create a research brief specific to this winery and filtered future event
            const wineryBrief = {
              winery_id: winery.id,
              suggested_theme: `Future Event Opportunity: ${event.event_name}`,
              key_points: [
                `Event: ${event.event_name}`,
                `Date: ${event.event_date}`,
                `Location: ${event.event_location}`,
                `Summary: ${event.event_summary}`,
                `Event URL: ${event.event_url}`,
                `Relevance Score: ${event.relevance_score}/10`,
                `Source: ${event.source_url}`,
                `Region: ${event.source_region}`,
                `Discovered: ${new Date().toLocaleDateString()}`,
                `Data Source: Two-step AI filtered scan (Gatekeeper approved)`,
                `Status: Non-competitor future event - safe for marketing`,
                `Time Frame: Next 3 months`
              ],
              local_event_name: event.event_name,
              local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
              local_event_location: event.event_location,
              seasonal_context: `REAL NON-COMPETITOR FUTURE EVENT discovered by comprehensive Event Engine with AI Gatekeeper filtering. ${event.event_summary} This is a verified non-competitive opportunity happening ${event.event_date} for ${winery.winery_name} to engage with the local wine community and create relevant marketing content. Event details and registration: ${event.event_url}`
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
            console.log(`✅ Created research brief for ${winery.winery_name} - ${event.event_name}`);

            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 50));

          } catch (error) {
            console.error(`Error processing ${event.event_name} for ${winery.winery_name}:`, error);
          }
        }
      }

      console.log(`🎉 COMPREHENSIVE Future Event Engine with AI Gatekeeper completed successfully!`);
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   Sources fetched: ${successfulScrapes.length}/${EVENT_SOURCES.length}`);
      console.log(`   Future events extracted: ${allPotentialEvents.length}`);
      console.log(`   Future events after gatekeeper: ${filteredEvents.length}`);
      console.log(`   Competitor events filtered: ${allPotentialEvents.length - filteredEvents.length}`);
      console.log(`   Final future events processed: ${finalEvents.length}`);
      console.log(`   Research briefs created: ${briefsCreatedCount}`);
      console.log(`   Content generation: DISABLED (user selection required)`);

      return new Response(JSON.stringify({
        success: true,
        message: `Two-step AI analysis: processed ${finalEvents.length} non-competitor FUTURE events from ${successfulScrapes.length} sources for ${wineries.length} wineries`,
        data_source: 'two_step_ai_filtered_future_scan',
        events_extracted: allPotentialEvents.length,
        events_after_gatekeeper: filteredEvents.length,
        competitor_events_filtered: allPotentialEvents.length - filteredEvents.length,
        events_final: finalEvents.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: 0, // No automatic content generation
        automatic_content_generation: false,
        scraped_sources: successfulScrapes.length,
        rss_sources_successful: successfulRSS.length,
        html_sources_successful: successfulHTML.length,
        total_sources: EVENT_SOURCES.length,
        coverage_regions: [...new Set(successfulScrapes.map(s => s.region))],
        time_frame: 'next_3_months',
        events: finalEvents.map(e => ({ 
          name: e.event_name, 
          date: e.event_date, 
          location: e.event_location,
          relevance: e.relevance_score,
          source: e.source_region,
          url: e.event_url
        })),
        source_performance: successfulScrapes.map(s => ({
          name: s.name,
          type: s.type,
          priority: s.priority,
          events_found: s.events_extracted?.length || 0,
          region: s.region
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (openaiError) {
      console.error('AI analysis failed:', openaiError);
      return new Response(JSON.stringify({
        success: false,
        error: `AI analysis failed: ${openaiError.message}`,
        potential_events_found: allPotentialEvents.length,
        scraped_sources: successfulScrapes.length
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

// Enhanced RSS event extraction with future date filtering
function extractRSSEvents(rssXml: string, source: any): { events: PotentialEvent[], text: string } {
  try {
    console.log(`📰 Processing RSS feed from ${source.name} (${source.region}) for FUTURE events`);
    
    // Extract RSS items using regex (simple XML parsing)
    const itemMatches = rssXml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    const events: PotentialEvent[] = [];
    let extractedText = `RSS Feed from ${source.name} (${source.region})\nFeed URL: ${source.url}\n\n`;
    
    itemMatches.forEach((item, index) => {
      if (index >= 100) return; // Limit to first 100 items for comprehensive coverage
      
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
      
      // Clean up HTML entities and tags
      const cleanTitle = title.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      const cleanDescription = description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      
      if (cleanTitle) {
        // Try to extract event date
        const eventDate = extractEventDate(cleanTitle, cleanDescription, pubDate);
        
        const event: PotentialEvent = {
          title: cleanTitle,
          description: cleanDescription,
          link: link || source.url,
          published: pubDate,
          source_name: source.name,
          source_region: source.region,
          event_date: eventDate || undefined
        };
        
        // Only include if it's a future event or if we can't determine the date
        if (!eventDate || isEventInFuture(eventDate)) {
          events.push(event);
          
          extractedText += `EVENT: ${cleanTitle}\n`;
          if (eventDate) extractedText += `EVENT DATE: ${eventDate}\n`;
          if (pubDate) extractedText += `PUBLISHED: ${pubDate}\n`;
          if (link) extractedText += `URL: ${link}\n`;
          if (cleanDescription) extractedText += `DESCRIPTION: ${cleanDescription}\n`;
          extractedText += `SOURCE: ${source.name} RSS Feed\n`;
          extractedText += `REGION: ${source.region}\n`;
          extractedText += `---\n\n`;
        }
      }
    });
    
    console.log(`✅ Extracted ${events.length} future events from ${source.name} RSS`);
    return { events, text: extractedText };
    
  } catch (error) {
    console.error(`Error parsing RSS from ${source.name}:`, error);
    return { events: [], text: `RSS Feed Error from ${source.name}: ${rssXml.substring(0, 5000)}` };
  }
}

// Enhanced HTML event extraction with future date filtering
function extractHTMLEvents(html: string, source: any): { events: PotentialEvent[], text: string } {
  try {
    console.log(`🌐 Processing HTML from ${source.name} (${source.region}) for FUTURE events`);
    
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/gi, '');
    
    // Extract potential event information using patterns
    const events: PotentialEvent[] = [];
    
    // Look for event-like patterns in the HTML
    const eventPatterns = [
      // Common event title patterns
      /<h[1-6][^>]*>([^<]*(?:event|festival|concert|market|tour|dinner|tasting|celebration)[^<]*)<\/h[1-6]>/gi,
      // Event list items
      /<li[^>]*>([^<]*(?:event|festival|concert|market|tour|dinner|tasting|celebration)[^<]*)<\/li>/gi,
      // Event divs with class names
      /<div[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/div>/gi
    ];
    
    eventPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null && events.length < 30) {
        const eventText = match[1].trim();
        if (eventText.length > 10 && eventText.length < 200) {
          // Try to extract date from the event text
          const eventDate = extractEventDate(eventText, '', '');
          
          const event: PotentialEvent = {
            title: eventText,
            description: `Event found on ${source.name}`,
            link: source.url,
            published: new Date().toISOString(),
            source_name: source.name,
            source_region: source.region,
            event_date: eventDate || undefined
          };
          
          // Only include if it's a future event or if we can't determine the date
          if (!eventDate || isEventInFuture(eventDate)) {
            events.push(event);
          }
        }
      }
    });
    
    // Remove HTML tags for text analysis
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&/g, '&');
    cleaned = cleaned.replace(/</g, '<');
    cleaned = cleaned.replace(/>/g, '>');
    cleaned = cleaned.replace(/"/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Filter for event-related content with future dates
    const eventKeywords = [
      'event', 'festival', 'tasting', 'wine', 'vineyard', 'celebration', 'concert', 'market', 'tour', 'dinner',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      '2024', '2025', 'weekend', 'saturday', 'sunday', 'upcoming', 'coming', 'next'
    ];
    
    const sentences = cleaned.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const keywordCount = eventKeywords.filter(keyword => lowerSentence.includes(keyword)).length;
      return keywordCount >= 2 && sentence.length > 30 && sentence.length < 300;
    });
    
    const extractedText = relevantSentences.slice(0, 50).join('. ') + '.';
    
    console.log(`✅ Extracted ${events.length} potential future events from ${source.name} HTML`);
    return { events, text: extractedText };
    
  } catch (error) {
    console.error(`Error extracting events from HTML ${source.name}:`, error);
    return { events: [], text: html.substring(0, 5000) };
  }
}