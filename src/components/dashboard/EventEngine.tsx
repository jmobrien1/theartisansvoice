import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Zap,
  TrendingUp,
  Eye,
  Play,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Globe,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface EventEngineProps {
  wineryProfile: any;
}

interface ProactiveEvent {
  id: string;
  suggested_theme: string;
  local_event_name: string;
  local_event_date: string;
  local_event_location: string;
  seasonal_context: string;
  created_at: string;
  content_count: number;
}

export function EventEngine({ wineryProfile }: EventEngineProps) {
  const [events, setEvents] = useState<ProactiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    thisWeekEvents: 0,
    contentGenerated: 0,
    lastScan: null as string | null
  });

  useEffect(() => {
    if (wineryProfile) {
      fetchProactiveEvents();
      fetchStats();
    }
  }, [wineryProfile]);

  const fetchProactiveEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('research_briefs')
        .select(`
          id,
          suggested_theme,
          local_event_name,
          local_event_date,
          local_event_location,
          seasonal_context,
          created_at,
          content_calendar!research_brief_id(count)
        `)
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const eventsWithCount = data?.map(event => ({
        ...event,
        content_count: event.content_calendar?.[0]?.count || 0
      })) || [];

      setEvents(eventsWithCount);
    } catch (error) {
      console.error('Error fetching proactive events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total events discovered
      const { count: totalEvents } = await supabase
        .from('research_briefs')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null);

      // Get events from this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: thisWeekEvents } = await supabase
        .from('research_briefs')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .gte('created_at', weekAgo.toISOString());

      // Get content generated from events
      const { count: contentGenerated } = await supabase
        .from('content_calendar')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryProfile.id)
        .not('research_brief_id', 'is', null);

      // Get last scan time (approximate) - Fixed: removed .single() and safely access array
      const { data: lastBriefs } = await supabase
        .from('research_briefs')
        .select('created_at')
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      setStats({
        totalEvents: totalEvents || 0,
        thisWeekEvents: thisWeekEvents || 0,
        contentGenerated: contentGenerated || 0,
        lastScan: lastBriefs?.[0]?.created_at || null
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const triggerManualScan = async () => {
    setScanning(true);
    
    try {
      console.log('Triggering manual scan...');
      
      // Call the scan-local-events function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          manual_trigger: true,
          winery_id: wineryProfile.id 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      console.log('Scan result:', result);

      if (result.success) {
        toast.success(`🎉 Event scan completed! Found ${result.events_processed || 0} events and generated ${result.content_generated || 0} pieces of content.`);
      } else {
        toast.success('✅ Event scan completed successfully!');
      }
      
      // Refresh data after a short delay to allow for processing
      setTimeout(async () => {
        await fetchProactiveEvents();
        await fetchStats();
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering manual scan:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          toast.error('Event scanning function not found. Please check your Supabase Edge Functions deployment.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error('Authentication error. Please check your Supabase configuration.');
        } else {
          toast.error(`Scan failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to trigger event scan. Please try again.');
      }
    } finally {
      setScanning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Engine</h1>
          <p className="text-gray-600">Proactive local event discovery and content generation</p>
        </div>
        <button
          onClick={triggerManualScan}
          disabled={scanning}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-colors shadow-lg"
        >
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Scanning...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Manual Scan
            </>
          )}
        </button>
      </div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">🤖 Automated Event Discovery</h3>
            <p className="text-sm text-gray-600">
              AI scans local event websites every Monday and creates relevant content opportunities
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Web Scraping</p>
              <p className="text-gray-600">Scans local tourism and wine event websites</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-purple-600 font-semibold text-xs">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">AI Analysis</p>
              <p className="text-gray-600">Identifies wine-relevant events and opportunities</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 font-semibold text-xs">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Content Creation</p>
              <p className="text-gray-600">Generates draft content for each discovered event</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Events Discovered</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalEvents}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">This Week</p>
              <p className="text-3xl font-bold text-green-600">{stats.thisWeekEvents}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Content Generated</p>
              <p className="text-3xl font-bold text-purple-600">{stats.contentGenerated}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Last Scan</p>
              <p className="text-lg font-bold text-gray-700">
                {stats.lastScan ? formatTimeAgo(stats.lastScan) : 'Never'}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Discovered Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Discovered Events</h3>
        
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{event.local_event_name}</h4>
                      {event.content_count > 0 && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {event.content_count} content created
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {event.local_event_date ? formatDate(event.local_event_date) : 'Date TBD'}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.local_event_location || 'Location TBD'}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{event.seasonal_context}</p>
                    
                    <p className="text-xs text-gray-500">
                      Discovered {formatTimeAgo(event.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {event.content_count > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No events discovered yet</p>
            <p className="text-sm text-gray-400 mt-1">
              The Event Engine runs automatically every Monday, or click "Manual Scan" to trigger now
            </p>
          </div>
        )}
      </motion.div>

      {/* Next Scan Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Automated Schedule</h3>
            <p className="text-sm text-gray-600">
              The Event Engine automatically scans for new opportunities every Monday at 9:00 AM. 
              When relevant events are found, draft content is automatically created and added to your pipeline.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}