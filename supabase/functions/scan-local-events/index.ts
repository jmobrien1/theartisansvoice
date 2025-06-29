/*
  # Real Event Engine - RSS Feed Implementation

  1. Purpose
    - Uses RSS feeds for reliable, structured event data
    - Provides event links for users to visit for details
    - More efficient and reliable than HTML scraping
    - Configurable scheduling system

  2. Functionality
    - Fetches RSS feeds from curated event sources
    - AI analyzes real RSS content for relevant events
    - Creates research briefs with event links
    - Triggers content generation for all wineries
    - Supports both scheduled and manual execution

  3. RSS Data Sources
    - Visit Loudoun RSS feed (primary source)
    - Other RSS feeds where available
    - Fallback to HTML scraping for non-RSS sources
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// CURATED EVENT SOURCES - RSS feeds preferred, HTML fallback
const EVENT_SOURCES = [
  // Category 1: RSS Feeds (Preferred - Structured Data)
  {
    url: 'https://www.visitloudoun.org/event/rss/',
    name: 'Visit Loudoun Events RSS',
    region: 'Loudoun County, VA',
    type: 'rss',
    priority: 'high',
    description: '#1 source for DC Wine Country events - RSS feed with structured data'
  },
  
  // Category 2: High-Value HTML Sources (Fallback)
  {
    url: 'https://www.fxva.com/events/',
    name: 'FXVA (Visit Fairfax) Events',
    region: 'Fairfax County, VA',
    type: 'html',
    priority: 'high',
    description: 'Large, affluent county with major festivals and venue events'
  },
  {
    url: 'https://www.virginia.org/events/',
    name: 'Virginia is for Lovers (Official State Tourism)',
    region: 'Virginia',
    type: 'html',
    priority: 'high',
    description: 'High-level source with largest, most significant festivals and wine/beer trails'
  },
  {
    url: 'https://northernvirginiamag.com/events/',
    name: 'Northern Virginia Magazine Events',
    region: 'Northern Virginia',
    type: 'html',
    priority: 'high',
    description: 'Curated high-end food, wine, and cultural events for target audience'
  },
  
  // Category 3: County Sources
  {
    url: 'https://www.visitpwc.com/events/',
    name: 'Prince William County Events',
    region: 'Prince William County, VA',
    type: 'html',
    priority: 'medium',
    description: 'Official tourism site for local breweries, parks, and historic sites'
  },
  {
    url: 'https://visitfauquier.com/all-events/',
    name: 'Visit Fauquier',
    region: 'Fauquier County, VA',
    type: 'html',
    priority: 'medium',
    description: 'Tourism-focused site for Warrenton and Marshall area events'
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

    console.log('🔍 Starting REAL event scan with RSS feeds and curated sources...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Step 1: Fetch Event Data (RSS + HTML) ---
    console.log('📡 Fetching event data from RSS feeds and websites...');
    
    // Sort sources by priority (high first)
    const prioritizedSources = EVENT_SOURCES.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const scrapedContents: ScrapedContent[] = await Promise.all(
      prioritizedSources.map(async (source) => {
        try {
          console.log(`Fetching: ${source.name} (${source.type.toUpperCase()}, ${source.priority} priority)`);
          
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': source.type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
              priority: source.priority,
              type: source.type
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
          
          console.log(`✅ Successfully fetched ${source.name} (${cleanedText.length} characters)`);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: cleanedText, 
            success: true,
            priority: source.priority,
            type: source.type
          };
          
        } catch (error) {
          console.error(`Error fetching ${source.name}:`, error);
          return { 
            url: source.url, 
            name: source.name,
            region: source.region,
            text: "", 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            priority: source.priority,
            type: source.type
          };
        }
      })
    );

    // Filter successful fetches
    const successfulScrapes = scrapedContents.filter(content => content.success && content.text.length > 200);
    const rssSources = successfulScrapes.filter(content => content.type === 'rss');
    const highPriorityScrapes = successfulScrapes.filter(content => content.priority === 'high');
    
    console.log(`📊 Fetch results: ${successfulScrapes.length}/${EVENT_SOURCES.length} sources successful (${rssSources.length} RSS, ${highPriorityScrapes.length} high-priority)`);
    
    if (successfulScrapes.length === 0) {
      console.error('❌ No successful fetches - all event sources failed');
      return new Response(JSON.stringify({
        success: false,
        error: "No event data could be fetched from any source",
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

    // Combine content, prioritizing RSS feeds and high-value sources
    const combinedText = successfulScrapes
      .sort((a, b) => {
        // RSS feeds first, then by priority
        if (a.type === 'rss' && b.type !== 'rss') return -1;
        if (a.type !== 'rss' && b.type === 'rss') return 1;
        
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .map(content => 
        `=== ${content.name} (${content.region}) - ${content.type.toUpperCase()} ${content.priority.toUpperCase()} PRIORITY ===\nSource: ${content.url}\n${content.text}`
      ).join('\n\n---\n\n');

    // --- Step 2: AI Analysis for Wine/Tourism Events ---
    console.log('🤖 Analyzing event data with AI for wine/tourism events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found - cannot analyze events');
      return new Response(JSON.stringify({
        success: false,
        error: "OpenAI API key not configured - cannot analyze event data",
        scraped_sources: successfulScrapes.length,
        total_sources: EVENT_SOURCES.length,
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          type: s.type,
          content_length: s.text.length 
        }))
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const analysisPrompt = `You are an expert event analyst specializing in wine tourism, craft beverage marketing, and local hospitality opportunities in the Virginia/DC metro region. Analyze the following REAL event data (including RSS feeds and website content) and extract upcoming events that would be highly relevant for wineries to create marketing content about.

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
- event_name: The EXACT name from the source
- event_date: Specific date in YYYY-MM-DD format
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- event_url: The direct link to the event page (extract from RSS links or construct from website URLs)
- relevance_score: Number from 1-10 (8+ for wine events, 6+ for tourism events, 5+ for community events)
- source_url: The website/RSS feed where this event was found
- source_region: The specific region/county this event is in

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Prioritize events from RSS feeds (more reliable data)
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content
- ALWAYS try to extract or construct the event_url for users to visit

IMPORTANT: For RSS feed data, look for <link> tags or URLs within the content. For website data, try to construct logical event URLs based on the source website structure.

Today's date is ${new Date().toLocaleDateString()}.

Respond ONLY with a valid JSON object containing a single key "events", which is an array of event objects. If no relevant events are found, return {"events":[]}.

EVENT DATA TO ANALYZE:
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
            { role: 'user', content: 'Please analyze the event data and extract relevant wine/tourism events with their URLs.' }
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
        console.log('ℹ️ No relevant events found in fetched content');
        return new Response(JSON.stringify({ 
          success: true,
          message: "No relevant events found in current event data",
          events_found: 0,
          scraped_sources: successfulScrapes.length,
          rss_sources: rssSources.length,
          high_priority_sources: highPriorityScrapes.length,
          total_sources: EVENT_SOURCES.length,
          scrape_details: successfulScrapes.map(s => ({ 
            name: s.name, 
            region: s.region, 
            priority: s.priority,
            type: s.type,
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
            source: e.source_region,
            url: e.event_url
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
                `Event URL: ${event.event_url}`,
                `Relevance Score: ${event.relevance_score}/10`,
                `Source: ${event.source_url}`,
                `Region: ${event.source_region}`,
                `Discovered: ${new Date().toLocaleDateString()}`
              ],
              local_event_name: event.event_name,
              local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
              local_event_location: event.event_location,
              seasonal_context: `Real event discovered by Event Engine from ${event.source_region}. ${event.event_summary} This is an actual opportunity for ${winery.winery_name} to engage with the local wine community. Event details: ${event.event_url}`
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
              key_talking_points: `${event.event_summary} Event details: ${event.event_date} at ${event.event_location}. This is a real opportunity happening in ${event.source_region} for ${winery.winery_name} to connect with the local wine community. Learn more: ${event.event_url}`,
              call_to_action: `Join us and discover exceptional wines at this exciting local event! Details: ${event.event_url}`
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
        data_source: 'real_events_with_rss',
        events_processed: events.length,
        wineries_processed: wineries.length,
        briefs_created: briefsCreatedCount,
        content_generated: contentGeneratedCount,
        scraped_sources: successfulScrapes.length,
        rss_sources: rssSources.length,
        high_priority_sources: highPriorityScrapes.length,
        total_sources: EVENT_SOURCES.length,
        scrape_details: successfulScrapes.map(s => ({ 
          name: s.name, 
          region: s.region, 
          priority: s.priority,
          type: s.type,
          content_length: s.text.length 
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

// Helper function to extract content from RSS feeds
function extractRSSContent(rssXml: string, source: any): string {
  try {
    console.log(`📰 Processing RSS feed from ${source.name}`);
    
    // Extract RSS items using regex (simple XML parsing)
    const itemMatches = rssXml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    
    let extractedContent = `RSS Feed from ${source.name} (${source.region})\n\n`;
    
    itemMatches.forEach((item, index) => {
      if (index >= 20) return; // Limit to first 20 items
      
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
        extractedContent += `EVENT: ${cleanTitle}\n`;
        if (pubDate) extractedContent += `DATE: ${pubDate}\n`;
        if (link) extractedContent += `URL: ${link}\n`;
        if (cleanDescription) extractedContent += `DESCRIPTION: ${cleanDescription}\n`;
        extractedContent += `---\n\n`;
      }
    });
    
    console.log(`✅ Extracted ${itemMatches.length} RSS items from ${source.name}`);
    return extractedContent;
    
  } catch (error) {
    console.error(`Error parsing RSS from ${source.name}:`, error);
    // Fallback to treating as regular text
    return rssXml.substring(0, 8000);
  }
}

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
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
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