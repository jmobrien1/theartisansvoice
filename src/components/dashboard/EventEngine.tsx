import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Plus, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Globe,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  ArrowRight,
  Settings,
  Info,
  Code
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface EventEngineProps {
  wineryProfile: any;
}

interface RawEvent {
  id: string;
  source_url: string;
  source_name: string;
  content_length: number;
  is_processed: boolean;
  created_at: string;
  scrape_timestamp: string;
}

interface ResearchBrief {
  id: string;
  suggested_theme: string;
  key_points: string[];
  local_event_name: string;
  local_event_date: string;
  local_event_location: string;
  seasonal_context: string;
  created_at: string;
}

export function EventEngine({ wineryProfile }: EventEngineProps) {
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [researchBriefs, setResearchBriefs] = useState<ResearchBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  useEffect(() => {
    if (wineryProfile) {
      fetchData();
    }
  }, [wineryProfile]);

  const fetchData = async () => {
    try {
      // Fetch raw events from Google Apps Script
      const { data: rawData, error: rawError } = await supabase
        .from('raw_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (rawError) throw rawError;
      setRawEvents(rawData || []);

      // Fetch research briefs for this winery
      const { data: briefsData, error: briefsError } = await supabase
        .from('research_briefs')
        .select('*')
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (briefsError) throw briefsError;
      setResearchBriefs(briefsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load Event Engine data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessGoogleData = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-local-events', {
        body: {
          manual_trigger: true,
          winery_id: wineryProfile.id,
          date_range: dateRange
        }
      });

      if (error) throw error;

      setLastScanResult(data);
      
      if (data.success) {
        toast.success(`✅ Pipeline complete! Found ${data.events_final || 0} relevant events`);
        await fetchData(); // Refresh the data
      } else {
        toast.error(data.error || 'Processing failed');
      }

    } catch (error) {
      console.error('Error processing Google Apps Script data:', error);
      toast.error('Failed to process Google Apps Script data');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateContent = async (brief: ResearchBrief) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          winery_id: wineryProfile.id,
          research_brief_id: brief.id,
          content_request: {
            content_type: 'blog_post',
            primary_topic: `Event Opportunity: ${brief.local_event_name}`,
            key_talking_points: brief.key_points.join('. '),
            call_to_action: `Join us for this exciting local event!`
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('✨ Content created successfully!');
        // Optionally redirect to content pipeline
      } else {
        toast.error(data.error || 'Content generation failed');
      }

    } catch (error) {
      console.error('Error creating content:', error);
      toast.error('Failed to create content');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const unprocessedCount = rawEvents.filter(e => !e.is_processed).length;
  const totalDataSize = rawEvents.reduce((sum, e) => sum + e.content_length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="h-7 w-7 text-purple-600 mr-3" />
            Event Engine
            <span className="ml-3 bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs px-3 py-1 rounded-full">
              GOOGLE POWERED
            </span>
          </h1>
          <p className="text-gray-600">
            Reliable event discovery powered by Google Apps Script infrastructure
          </p>
        </div>
      </div>

      {/* Google Apps Script Pipeline Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Code className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Google Apps Script Pipeline</h3>
              <p className="text-sm text-gray-600">
                Reliable RSS scanning → Clean data extraction → AI event filtering
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{rawEvents.length}</div>
            <div className="text-xs text-gray-500">Events ingested</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unprocessed Data</p>
                <p className="text-xl font-bold text-green-600">{unprocessedCount}</p>
              </div>
              <Clock className="h-5 w-5 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clean Data Size</p>
                <p className="text-xl font-bold text-blue-600">
                  {(totalDataSize / 1024).toFixed(0)}KB
                </p>
              </div>
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Events Found</p>
                <p className="text-xl font-bold text-purple-600">{researchBriefs.length}</p>
              </div>
              <Target className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <button
          onClick={handleProcessGoogleData}
          disabled={processing || unprocessedCount === 0}
          className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Processing Google Data...
            </>
          ) : unprocessedCount > 0 ? (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Process {unprocessedCount} New Events
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              All Data Processed
            </>
          )}
        </button>

        {unprocessedCount === 0 && rawEvents.length > 0 && (
          <p className="text-center text-sm text-gray-600 mt-2">
            All Google Apps Script data has been processed. Run your Google Apps Script to get new data.
          </p>
        )}
      </motion.div>

      {/* Last Scan Results */}
      {lastScanResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            Last Processing Results
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {lastScanResult.raw_events_processed || 0}
              </div>
              <div className="text-xs text-gray-500">Sources Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {lastScanResult.events_extracted || 0}
              </div>
              <div className="text-xs text-gray-500">Events Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {lastScanResult.competitor_events_filtered || 0}
              </div>
              <div className="text-xs text-gray-500">Competitors Filtered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {lastScanResult.events_final || 0}
              </div>
              <div className="text-xs text-gray-500">Final Events</div>
            </div>
          </div>

          {lastScanResult.events && lastScanResult.events.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Events Discovered:</h4>
              <div className="space-y-2">
                {lastScanResult.events.slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-600">{event.date} • {event.location}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        Score: {event.relevance}/10
                      </div>
                      <div className="text-xs text-gray-500">{event.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Google Apps Script Sources Status */}
      {rawEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="h-5 w-5 text-green-500 mr-2" />
            Google Apps Script Data Sources
          </h3>
          
          <div className="space-y-3">
            {rawEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {event.source_name || event.source_url}
                  </p>
                  <p className="text-xs text-gray-600">
                    {(event.content_length / 1024).toFixed(1)}KB • 
                    Processed {formatDateTime(event.scrape_timestamp)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {event.is_processed ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Processed
                    </span>
                  ) : (
                    <span className="flex items-center text-amber-600 text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Discovered Events */}
      {researchBriefs.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-green-500 mr-2" />
            Discovered Event Opportunities
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchBriefs.map((brief) => (
              <div key={brief.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {brief.local_event_name}
                    </h4>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(brief.local_event_date)}
                      <MapPin className="h-4 w-4 ml-3 mr-1" />
                      {brief.local_event_location}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {brief.seasonal_context}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Google Verified Non-Competitor
                  </span>
                  <button
                    onClick={() => handleCreateContent(brief)}
                    className="flex items-center px-3 py-1 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 text-sm transition-colors"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-8 text-center"
        >
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Discovered Yet</h3>
          <p className="text-gray-600 mb-4">
            {rawEvents.length === 0 
              ? "Run your Google Apps Script to start discovering local events automatically."
              : unprocessedCount > 0
              ? "Process the Google Apps Script data above to discover relevant local events."
              : "No relevant events found in the current data. Run your Google Apps Script to get fresh data."
            }
          </p>
        </motion.div>
      )}

      {/* Setup Instructions */}
      {rawEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 text-green-500 mr-2" />
            Google Apps Script Setup Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="font-medium text-gray-900">Google Apps Script Created</p>
                <p className="text-sm text-gray-600">
                  Your CraftAmplify Scanner is ready and running on Google's reliable infrastructure.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
              <div>
                <p className="font-medium text-gray-900">Webhook Configured</p>
                <p className="text-sm text-gray-600">
                  Data pipeline is configured to send clean event data to your Supabase backend.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">!</div>
              <div>
                <p className="font-medium text-gray-900">Waiting for First Run</p>
                <p className="text-sm text-gray-600">
                  Run your Google Apps Script manually or wait for the scheduled execution to start discovering events.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="h-4 w-4 text-green-500" />
              <span className="font-medium text-gray-900">Webhook Endpoint</span>
            </div>
            <code className="text-sm bg-gray-100 p-2 rounded block break-all">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-raw-events
            </code>
          </div>
        </motion.div>
      )}
    </div>
  );
}