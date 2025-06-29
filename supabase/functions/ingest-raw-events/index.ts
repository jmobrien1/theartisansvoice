/*
  # Apify Webhook Ingestion Function

  1. Purpose
    - Secure endpoint for Apify to send scraped data
    - Simple data ingestion with no processing
    - Stores raw HTML/XML for later AI analysis

  2. Functionality
    - Receives POST requests from Apify webhook
    - Validates and stores raw content in raw_events table
    - No AI processing - pure data ingestion

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

interface ApifyWebhookPayload {
  source_url: string;
  source_name?: string;
  raw_content: string;
  apify_run_id?: string;
  scrape_timestamp?: string;
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

    console.log('🔄 Apify webhook received');

    const payload: ApifyWebhookPayload = await req.json();

    // Validate required fields
    if (!payload.source_url || !payload.raw_content) {
      console.error('❌ Invalid payload: missing source_url or raw_content');
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: source_url and raw_content" 
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

    // Validate content length
    if (payload.raw_content.length < 100) {
      console.error('❌ Content too short, likely blocked or failed scrape');
      return new Response(
        JSON.stringify({ 
          error: "Raw content too short - possible scraping failure" 
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

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert raw data into database
    const { data, error } = await supabase
      .from('raw_events')
      .insert([{
        source_url: payload.source_url,
        source_name: payload.source_name || payload.source_url,
        raw_content: payload.raw_content,
        apify_run_id: payload.apify_run_id,
        scrape_timestamp: payload.scrape_timestamp ? new Date(payload.scrape_timestamp).toISOString() : new Date().toISOString(),
        is_processed: false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to store raw data",
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

    console.log(`✅ Raw data stored successfully: ${payload.source_url} (${payload.raw_content.length} chars)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Raw data ingested successfully",
        data: {
          id: data.id,
          source_url: data.source_url,
          content_length: data.content_length,
          created_at: data.created_at
        }
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