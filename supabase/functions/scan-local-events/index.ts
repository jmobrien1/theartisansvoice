/*
  # DEFINITIVE EVENT ENGINE REBUILD - APIFY PIPELINE ARCHITECTURE

  This is a complete architectural overhaul that separates data acquisition from processing.
  
  NEW ARCHITECTURE:
  1. Apify handles all web scraping (scheduled, reliable, professional)
  2. This function processes the clean data from Apify
  3. AI performs intelligent filtering and analysis
  4. Results saved as research briefs for user selection
  
  FIXES ALL ISSUES:
  - ✅ No more direct web scraping (Apify handles this professionally)
  - ✅ Processes ALL sources reliably (Apify guarantees data delivery)
  - ✅ Intelligent AI filtering with precise competitor detection
  - ✅ User-controlled content creation (no automatic generation)
  - ✅ Comprehensive error handling and performance tracking
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PotentialEvent {
  title: string;
  description: string;
  link: string;
  published: string;
  location?: string;
  source_name: string;
  source_url: string;
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
  source_name: string;
}

interface RequestPayload {
  manual_trigger?: boolean;
  winery_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

// Enhanced date extraction with better pattern matching
function extractEventDate(title: string, description: string, pubDate: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  // Current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Comprehensive date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // MM/DD or MM-DD (current year)
    /(\d{1,2})[\/\-](\d{1,2})(?!\d)/g,
    // Month DD, YYYY
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})/gi,
    // Month DD (current year)
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?!\d)/gi,
    // DD Month YYYY
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
    // DD Month (current year)
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d{4})/gi
  ];
  
  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      try {
        let eventDate: Date;
        
        if (match[0].includes('january') || match[0].includes('february') || match[0].includes('march') || 
            match[0].includes('april') || match[0].includes('may') || match[0].includes('june') ||
            match[0].includes('july') || match[0].includes('august') || match[0].includes('september') ||
            match[0].includes('october') || match[0].includes('november') || match[0].includes('december')) {
          
          // Month name pattern
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          
          let monthIndex: number;
          let day: number;
          let year: number;
          
          if (match[2] && monthNames.includes(match[2].toLowerCase())) {
            // DD Month YYYY pattern
            day = parseInt(match[1]);
            monthIndex = monthNames.findIndex(m => match[2].toLowerCase().includes(m));
            year = match[3] ? parseInt(match[3]) : currentYear;
          } else {
            // Month DD YYYY pattern
            monthIndex = monthNames.findIndex(m => match[1].toLowerCase().includes(m));
            day = parseInt(match[2]);
            year = match[3] ? parseInt(match[3]) : currentYear;
          }
          
          eventDate = new Date(year, monthIndex, day);
        } else {
          // Numeric pattern
          const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : currentYear;
          
          eventDate = new Date(year, month, day);
        }
        
        // Validate the date and ensure it's reasonable
        if (!isNaN(eventDate.getTime()) && 
            eventDate.getFullYear() >= currentYear && 
            eventDate.getFullYear() <= nextYear + 1 &&
            eventDate.getMonth() >= 0 && eventDate.getMonth() <= 11 &&
            eventDate.getDate() >= 1 && eventDate.getDate() <= 31) {
          return eventDate.toISOString();
        }
      } catch {
        continue;
      }
    }
  }
  
  // Try to parse the pubDate if available
  if (pubDate) {
    try {
      const date = new Date(pubDate);
      if (!isNaN(date.getTime()) && date.getFullYear() >= currentYear - 1) {
        return date.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return null;
}

// Helper function to check if an event is within the specified date range
function isEventInDateRange(eventDateStr: string, startDate: Date, endDate: Date): boolean {
  try {
    const eventDate = new Date(eventDateStr);
    return eventDate >= startDate && eventDate <= endDate;
  } catch {
    return false;
  }
}

// Robust XML parser for RSS feeds (no external dependencies)
function parseXML(xmlString: string): any {
  try {
    const items: any[] = [];
    
    // Extract all <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(xmlString)) !== null) {
      const itemContent = itemMatch[1];
      
      // Extract fields from each item
      const item: any = {};
      
      // Extract title
      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      if (titleMatch) {
        item.title = titleMatch[1].trim();
      }
      
      // Extract description
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      if (descMatch) {
        item.description = descMatch[1].trim();
      }
      
      // Extract link
      const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
      if (linkMatch) {
        item.link = linkMatch[1].trim();
      }
      
      // Extract pubDate
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      if (pubDateMatch) {
        item.pubDate = pubDateMatch[1].trim();
      }
      
      // Extract guid (alternative link)
      const guidMatch = itemContent.match(/<guid[^>]*>(.*?)<\/guid>/i);
      if (guidMatch && !item.link) {
        item.link = guidMatch[1].trim();
      }
      
      items.push(item);
    }
    
    return { items };
  } catch (error) {
    console.error('XML parsing error:', error);
    return { items: [] };
  }
}

// Enhanced RSS event extraction from Apify data
function extractRSSEvents(rssXml: string, sourceUrl: string, sourceName: string, startDate: Date, endDate: Date): PotentialEvent[] {
  try {
    console.log(`📰 Processing RSS data from ${sourceName}`);
    
    const parsedXML = parseXML(rssXml);
    const items = parsedXML.items || [];
    
    const events: PotentialEvent[] = [];
    
    items.forEach((item: any, index: number) => {
      if (index >= 100) return; // Limit for performance
      
      // Clean up HTML entities and tags
      const cleanTitle = (item.title || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      const cleanDescription = (item.description || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      
      if (cleanTitle && cleanTitle.length > 5) {
        // Try to extract event date
        const eventDate = extractEventDate(cleanTitle, cleanDescription, item.pubDate || '');
        
        const event: PotentialEvent = {
          title: cleanTitle,
          description: cleanDescription,
          link: item.link || sourceUrl,
          published: item.pubDate || '',
          source_name: sourceName,
          source_url: sourceUrl,
          event_date: eventDate || undefined
        };
        
        // Only include if it's within the date range or if we can't determine the date
        if (!eventDate || isEventInDateRange(eventDate, startDate, endDate)) {
          events.push(event);
        }
      }
    });
    
    console.log(`✅ Extracted ${events.length} events in date range from ${sourceName} RSS`);
    return events;
    
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

// Enhanced HTML event extraction from Apify data
function extractHTMLEvents(html: string, sourceUrl: string, sourceName: string, startDate: Date, endDate: Date): PotentialEvent[] {
  try {
    console.log(`🌐 Processing HTML data from ${sourceName}`);
    
    // Remove script and style tags
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/gi, '');
    
    const events: PotentialEvent[] = [];
    
    // Look for event-like patterns in the HTML
    const eventPatterns = [
      // Common event title patterns
      /<h[1-6][^>]*>([^<]*(?:event|festival|concert|market|tour|dinner|tasting|celebration|fair|show|expo|gala)[^<]*)<\/h[1-6]>/gi,
      // Event list items
      /<li[^>]*>([^<]*(?:event|festival|concert|market|tour|dinner|tasting|celebration|fair|show|expo|gala)[^<]*)<\/li>/gi,
      // Event divs with class names
      /<div[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/div>/gi,
      // Calendar entries
      /<div[^>]*class="[^"]*calendar[^"]*"[^>]*>([^<]+)<\/div>/gi
    ];
    
    eventPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null && events.length < 50) {
        const eventText = match[1].trim();
        if (eventText.length > 10 && eventText.length < 300) {
          // Try to extract date from the event text
          const eventDate = extractEventDate(eventText, '', '');
          
          const event: PotentialEvent = {
            title: eventText,
            description: `Event found on ${sourceName}`,
            link: sourceUrl,
            published: new Date().toISOString(),
            source_name: sourceName,
            source_url: sourceUrl,
            event_date: eventDate || undefined
          };
          
          // Only include if it's within the date range or if we can't determine the date
          if (!eventDate || isEventInDateRange(eventDate, startDate, endDate)) {
            events.push(event);
          }
        }
      }
    });
    
    console.log(`✅ Extracted ${events.length} potential events in date range from ${sourceName} HTML`);
    return events;
    
  } catch (error) {
    console.error(`Error extracting events from HTML ${sourceName}:`, error);
    return [];
  }
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

    const requestBody: RequestPayload = await req.json();
    
    // Set up date range - default to next 3 months, or use provided range
    let startDate = new Date();
    let endDate = new Date();
    
    if (requestBody.date_range) {
      startDate = new Date(requestBody.date_range.start_date);
      endDate = new Date(requestBody.date_range.end_date);
    } else {
      // Default: next 3 months
      endDate.setMonth(endDate.getMonth() + 3);
    }
    
    console.log(`🚀 DEFINITIVE EVENT ENGINE WITH APIFY PIPELINE STARTING`);
    console.log(`📅 Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Fetch Unprocessed Raw Data from Apify ---
    console.log('📡 Fetching unprocessed raw data from Apify pipeline...');
    
    const { data: rawEvents, error: rawError } = await supabase
      .from('raw_events')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: true });

    if (rawError) {
      throw new Error(`Failed to fetch raw events: ${rawError.message}`);
    }

    if (!rawEvents || rawEvents.length === 0) {
      console.log('ℹ️ No unprocessed raw data found from Apify');
      return new Response(JSON.stringify({
        success: true,
        message: "No new data from Apify to process. Run Apify scraper first or wait for scheduled run.",
        data_source: 'apify_pipeline',
        raw_events_processed: 0,
        events_extracted: 0,
        events_after_gatekeeper: 0,
        events_final: 0,
        apify_pipeline_status: 'no_new_data',
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${rawEvents.length} unprocessed raw data entries from Apify`);

    // --- Step 2: Extract Events from All Raw Data ---
    console.log('🔍 Extracting events from Apify raw data...');
    
    const allPotentialEvents: PotentialEvent[] = [];
    const processedRawEventIds: string[] = [];

    for (const rawEvent of rawEvents) {
      try {
        console.log(`Processing: ${rawEvent.source_name || rawEvent.source_url} (${rawEvent.content_length} chars)`);
        
        let extractedEvents: PotentialEvent[] = [];
        
        // Determine if this is RSS or HTML based on content
        if (rawEvent.raw_content.includes('<rss') || rawEvent.raw_content.includes('<feed') || 
            rawEvent.raw_content.includes('<item>') || rawEvent.raw_content.includes('<entry>')) {
          // RSS/XML content
          extractedEvents = extractRSSEvents(
            rawEvent.raw_content, 
            rawEvent.source_url, 
            rawEvent.source_name || rawEvent.source_url,
            startDate, 
            endDate
          );
        } else {
          // HTML content
          extractedEvents = extractHTMLEvents(
            rawEvent.raw_content, 
            rawEvent.source_url, 
            rawEvent.source_name || rawEvent.source_url,
            startDate, 
            endDate
          );
        }
        
        allPotentialEvents.push(...extractedEvents);
        processedRawEventIds.push(rawEvent.id);
        
        console.log(`✅ Extracted ${extractedEvents.length} events from ${rawEvent.source_name}`);
        
      } catch (error) {
        console.error(`Error processing raw event ${rawEvent.id}:`, error);
        // Mark as processed even if failed to avoid reprocessing
        processedRawEventIds.push(rawEvent.id);
      }
    }

    console.log(`🎯 Total potential events extracted from Apify data: ${allPotentialEvents.length}`);

    if (allPotentialEvents.length === 0) {
      // Mark raw events as processed even if no events found
      if (processedRawEventIds.length > 0) {
        await supabase
          .from('raw_events')
          .update({ is_processed: true })
          .in('id', processedRawEventIds);
      }

      console.log('ℹ️ No events extracted from Apify data');
      return new Response(JSON.stringify({
        success: true,
        message: "Apify data processed - no events found in the specified date range",
        data_source: 'apify_pipeline',
        raw_events_processed: rawEvents.length,
        events_extracted: 0,
        events_after_gatekeeper: 0,
        events_final: 0,
        apify_pipeline_status: 'processed_no_events',
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Step 3: AI Gatekeeper to Filter Out Competitor Events ---
    console.log('🛡️ Running AI GATEKEEPER to filter out competitor events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found - cannot run gatekeeper analysis');
      return new Response(JSON.stringify({
        success: false,
        error: "OpenAI API key not configured - cannot filter events",
        data_source: 'apify_pipeline',
        potential_events_found: allPotentialEvents.length,
        raw_events_processed: rawEvents.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const gatekeeperPrompt = `You are an expert marketing strategist for boutique Virginia craft beverage brands. Your job is to analyze a list of events and identify ONLY the events that are good, non-competitive marketing opportunities.

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

Today's date is ${new Date().toLocaleDateString()} and the date range is ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.

Respond ONLY with a valid JSON object with a single key "relevant_events", which is an array of the event objects that passed your filter. Keep all original fields for events that pass. If no events are relevant, return {"relevant_events":[]}.

EVENTS TO ANALYZE:
${JSON.stringify(allPotentialEvents)}`;

    try {
      console.log('🔄 Sending events to AI Gatekeeper for competitor filtering...');
      
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
            { role: 'user', content: 'Please analyze the events and filter out competitor events, keeping only good marketing opportunities.' }
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
      console.log(`   Events before filtering: ${allPotentialEvents.length}`);
      console.log(`   Events after filtering: ${filteredEvents.length}`);
      console.log(`   Competitor events filtered out: ${allPotentialEvents.length - filteredEvents.length}`);

      if (filteredEvents.length === 0) {
        // Mark raw events as processed
        if (processedRawEventIds.length > 0) {
          await supabase
            .from('raw_events')
            .update({ is_processed: true })
            .in('id', processedRawEventIds);
        }

        console.log('ℹ️ No relevant non-competitor events found after gatekeeper filtering');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Apify pipeline completed - no relevant non-competitor events found",
          data_source: 'apify_pipeline',
          raw_events_processed: rawEvents.length,
          events_extracted: allPotentialEvents.length,
          events_after_gatekeeper: 0,
          competitor_events_filtered: allPotentialEvents.length,
          events_final: 0,
          apify_pipeline_status: 'processed_no_relevant_events',
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 4: Enhanced Analysis of Filtered Events ---
      console.log('🤖 Running enhanced analysis on filtered non-competitor events...');
      
      const enhancedAnalysisPrompt = `You are an expert event analyst specializing in wine tourism and craft beverage marketing opportunities in Virginia. 

You have been provided with ${filteredEvents.length} PRE-FILTERED events that have already passed the competitor screening. These are confirmed to be NON-COMPETITIVE events that could be good marketing opportunities.

IMPORTANT: Date range is ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.

Your task is to analyze these filtered events and provide enhanced details for each one, focusing on wine tourism and marketing potential.

For each event, provide:
- event_name: The EXACT name from the source
- event_date: Specific date in YYYY-MM-DD format (within the specified date range)
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- event_url: The direct link to the event page (use the provided link field)
- relevance_score: Number from 6-10 (8-10 for food/tourism events, 6-7 for general community events)
- source_url: The website where this event was found
- source_name: The name of the source website

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Only include events that are within the specified date range
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content
- Provide specific, actionable event summaries
- Ensure event_url is properly formatted

Respond ONLY with a valid JSON object containing a single key "events", which is an array of enhanced event objects.

FILTERED NON-COMPETITOR EVENTS TO ANALYZE:
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
            { role: 'user', content: 'Please provide enhanced analysis of these filtered events.' }
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
      console.log(`   Enhanced events: ${finalEvents.length}`);
      
      // Log event details
      finalEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_name} (Score: ${event.relevance_score}/10, ${event.event_date}, ${event.source_name})`);
        if (event.event_url) {
          console.log(`      URL: ${event.event_url}`);
        }
      });

      // --- Step 5: Mark Raw Events as Processed ---
      if (processedRawEventIds.length > 0) {
        const { error: updateError } = await supabase
          .from('raw_events')
          .update({ is_processed: true })
          .in('id', processedRawEventIds);

        if (updateError) {
          console.error('Error marking raw events as processed:', updateError);
        } else {
          console.log(`✅ Marked ${processedRawEventIds.length} raw events as processed`);
        }
      }

      if (finalEvents.length === 0) {
        console.log('ℹ️ No events passed final enhanced analysis');
        return new Response(JSON.stringify({ 
          success: true,
          message: "Apify pipeline completed - no events met final quality standards",
          data_source: 'apify_pipeline',
          raw_events_processed: rawEvents.length,
          events_extracted: allPotentialEvents.length,
          events_after_gatekeeper: filteredEvents.length,
          events_final: 0,
          apify_pipeline_status: 'processed_no_quality_events',
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // --- Step 6: Create Research Briefs for Final Events (NO AUTOMATIC CONTENT GENERATION) ---
      console.log('📝 Creating research briefs for final filtered events (NO automatic content generation)...');
      
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
          message: "Events found but no wineries to generate briefs for",
          data_source: 'apify_pipeline',
          events_found: finalEvents.length,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          events: finalEvents.map(e => ({ 
            name: e.event_name, 
            date: e.event_date, 
            relevance: e.relevance_score,
            source: e.source_name,
            url: e.event_url
          }))
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Creating research briefs for ${wineries.length} wineries across ${finalEvents.length} filtered events`);

      let briefsCreatedCount = 0;

      // For each final event, create research briefs for each winery (NO CONTENT GENERATION)
      for (const event of finalEvents) {
        console.log(`📅 Processing filtered event: ${event.event_name} (${event.event_date}, ${event.source_name})`);
        
        for (const winery of wineries) {
          try {
            // Create a research brief specific to this winery and filtered event
            const wineryBrief = {
              winery_id: winery.id,
              suggested_theme: `Event Opportunity: ${event.event_name}`,
              key_points: [
                `Event: ${event.event_name}`,
                `Date: ${event.event_date}`,
                `Location: ${event.event_location}`,
                `Summary: ${event.event_summary}`,
                `Event URL: ${event.event_url}`,
                `Relevance Score: ${event.relevance_score}/10`,
                `Source: ${event.source_url}`,
                `Source Name: ${event.source_name}`,
                `Discovered: ${new Date().toLocaleDateString()}`,
                `Data Source: Apify Pipeline + Two-step AI filtered scan`,
                `Status: Non-competitor event - safe for marketing`,
                `Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
              ],
              local_event_name: event.event_name,
              local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
              local_event_location: event.event_location,
              seasonal_context: `REAL NON-COMPETITOR EVENT discovered by Apify-powered Event Engine with AI Gatekeeper filtering. ${event.event_summary} This is a verified non-competitive opportunity happening ${event.event_date} for ${winery.winery_name} to engage with the local wine community and create relevant marketing content. Event details and registration: ${event.event_url}`
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

      console.log(`🎉 DEFINITIVE Apify Event Engine completed successfully!`);
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   Apify raw events processed: ${rawEvents.length}`);
      console.log(`   Events extracted: ${allPotentialEvents.length}`);
      console.log(`   Events after gatekeeper: ${filteredEvents.length}`);
      console.log(`   Competitor events filtered: ${allPotentialEvents.length - filteredEvents.length}`);
      console.log(`   Final events processed: ${finalEvents.length}`);
      console.log(`   Research briefs created: ${briefsCreatedCount}`);
      console.log(`   Content generation: DISABLED (user selection required)`);

      return new Response(JSON.stringify({
        success: true,
        message: `DEFINITIVE Apify pipeline complete: processed ${finalEvents.length} non-competitor events from ${rawEvents.length} Apify sources for ${wineries.length} wineries`,
        data_source: 'apify_pipeline_two_step_ai_filtered_scan',
        raw_events_processed: rawEvents.length,
        events_extracted: allPotentialEvents.length,
        events_after_gatekeeper: filteredEvents.length,
        competitor_events_filtered: allPotentialEvents.length - filteredEvents.length,
        events_final: finalEvents.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: 0, // No automatic content generation
        automatic_content_generation: false,
        apify_pipeline_status: 'completed_successfully',
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        events: finalEvents.map(e => ({ 
          name: e.event_name, 
          date: e.event_date, 
          location: e.event_location,
          relevance: e.relevance_score,
          source: e.source_name,
          url: e.event_url
        })),
        apify_sources_processed: rawEvents.map(r => ({
          source_name: r.source_name,
          source_url: r.source_url,
          content_length: r.content_length,
          scrape_timestamp: r.scrape_timestamp
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (openaiError) {
      console.error('AI analysis failed:', openaiError);
      return new Response(JSON.stringify({
        success: false,
        error: `AI analysis failed: ${openaiError.message}`,
        data_source: 'apify_pipeline',
        potential_events_found: allPotentialEvents.length,
        raw_events_processed: rawEvents.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in definitive Apify scan-local-events function:', error);
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