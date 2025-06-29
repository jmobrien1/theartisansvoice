/*
  # Google Apps Script Webhook Ingestion Function

  1. Purpose
    - Secure endpoint for Google Apps Script to send clean event data
    - Simple data ingestion with structured JSON payload
    - Stores clean event data for AI processing

  2. Functionality
    - Receives POST requests from Google Apps Script
    - Validates and stores event data in raw_events table
    - No web scraping - pure data ingestion from Google's reliable infrastructure

  3. Security
    - Uses service role for database access
    - Validates webhook payload structure
    - Logs all ingestion attempts for debugging
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface GoogleAppsScriptEvent {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface GoogleAppsScriptPayload {
  events: GoogleAppsScriptEvent[];
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

    console.log('🔄 Google Apps Script webhook received');

    const payload: GoogleAppsScriptPayload = await req.json();

    // Validate payload structure
    if (!payload.events || !Array.isArray(payload.events)) {
      console.error('❌ Invalid payload: missing events array');
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: events (must be an array)" 
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

    if (payload.events.length === 0) {
      console.log('ℹ️ No events in payload');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No events to process",
          events_processed: 0
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`📊 Processing ${payload.events.length} events from Google Apps Script`);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawEventsToInsert = [];

    // Process each event from Google Apps Script
    for (const event of payload.events) {
      // Validate event structure
      if (!event.title || !event.description) {
        console.warn('⚠️ Skipping event with missing title or description');
        continue;
      }

      // Create raw content string combining all event data
      const rawContent = `Title: ${event.title}
Description: ${event.description}
Link: ${event.link || 'No link provided'}
Published: ${event.pubDate || 'No date provided'}`;

      // Determine source name from link
      let sourceName = 'Unknown Source';
      if (event.link) {
        if (event.link.includes('visitloudoun')) sourceName = 'Visit Loudoun Events';
        else if (event.link.includes('fxva.com')) sourceName = 'FXVA Events';
        else if (event.link.includes('virginia.org')) sourceName = 'Virginia Tourism Events';
        else if (event.link.includes('visitpwc')) sourceName = 'Prince William County Events';
        else if (event.link.includes('visitfauquier')) sourceName = 'Visit Fauquier Events';
        else if (event.link.includes('northernvirginiamag')) sourceName = 'Northern Virginia Magazine Events';
        else if (event.link.includes('discoverclarkecounty')) sourceName = 'Discover Clarke County Events';
        else sourceName = new URL(event.link).hostname;
      }

      rawEventsToInsert.push({
        source_url: event.link || 'https://google-apps-script-source',
        source_name: sourceName,
        raw_content: rawContent,
        is_processed: false,
        scrape_timestamp: new Date().toISOString()
      });
    }

    if (rawEventsToInsert.length === 0) {
      console.log('ℹ️ No valid events to insert');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No valid events found to process",
          events_processed: 0
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Insert all raw events into database
    const { data, error } = await supabase
      .from('raw_events')
      .insert(rawEventsToInsert)
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to store event data",
          details: error.message
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

    console.log(`✅ Successfully stored ${data?.length || 0} events from Google Apps Script`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully ingested ${data?.length || 0} events from Google Apps Script`,
        events_processed: data?.length || 0,
        data: data?.map(item => ({
          id: item.id,
          source_name: item.source_name,
          content_length: item.content_length,
          created_at: item.created_at
        }))
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error('❌ Error in ingest-raw-events function:', error);
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