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
  Users,
  MoreVertical,
  Trash2,
  EyeOff,
  X,
  Settings,
  Save,
  ExternalLink,
  CalendarDays,
  Shield,
  Server,
  Cpu,
  Database,
  Workflow,
  ArrowRight
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
  key_points: string[];
  event_url?: string;
}

interface ScheduleSettings {
  enabled: boolean;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  hour: number; // 0-23
  timezone: string;
}

interface DateRange {
  start_date: string;
  end_date: string;
}

export function EventEngine({ wineryProfile }: EventEngineProps) {
  const [events, setEvents] = useState<ProactiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<ProactiveEvent | null>(null);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showApifySetupInfo, setShowApifySetupInfo] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    enabled: true,
    day_of_week: 1, // Monday
    hour: 9, // 9 AM
    timezone: 'America/New_York'
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date.toISOString().split('T')[0];
    })()
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    thisWeekEvents: 0,
    contentGenerated: 0,
    lastScan: null as string | null,
    rawEventsCount: 0,
    processedEventsCount: 0
  });

  useEffect(() => {
    if (wineryProfile) {
      fetchProactiveEvents();
      fetchStats();
      loadScheduleSettings();
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
          key_points,
          created_at,
          content_calendar!research_brief_id(count)
        `)
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const eventsWithCount = data?.map(event => {
        // Extract event URL from key_points or seasonal_context
        let eventUrl = '';
        if (event.key_points) {
          const urlPoint = event.key_points.find((point: string) => point.includes('Event URL:'));
          if (urlPoint) {
            eventUrl = urlPoint.replace('Event URL:', '').trim();
          }
        }
        if (!eventUrl && event.seasonal_context) {
          const urlMatch = event.seasonal_context.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            eventUrl = urlMatch[0];
          }
        }

        return {
          ...event,
          content_count: event.content_calendar?.[0]?.count || 0,
          event_url: eventUrl
        };
      }) || [];

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

      // Get raw events stats
      const { count: rawEventsCount } = await supabase
        .from('raw_events')
        .select('*', { count: 'exact', head: true });

      const { count: processedEventsCount } = await supabase
        .from('raw_events')
        .select('*', { count: 'exact', head: true })
        .eq('is_processed', true);

      // Get last scan time
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
        lastScan: lastBriefs?.[0]?.created_at || null,
        rawEventsCount: rawEventsCount || 0,
        processedEventsCount: processedEventsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      // In a real implementation, you'd load this from a settings table
      // For now, we'll use localStorage as a simple solution
      const saved = localStorage.getItem(`event-schedule-${wineryProfile.id}`);
      if (saved) {
        setScheduleSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const saveScheduleSettings = async () => {
    try {
      // In a real implementation, you'd save this to a settings table
      // For now, we'll use localStorage as a simple solution
      localStorage.setItem(`event-schedule-${wineryProfile.id}`, JSON.stringify(scheduleSettings));
      toast.success('Schedule settings saved successfully!');
      setShowScheduleSettings(false);
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      toast.error('Failed to save schedule settings');
    }
  };

  const triggerManualScan = async (customDateRange?: DateRange) => {
    setScanning(true);
    
    try {
      console.log('Triggering Apify pipeline processing with date range:', customDateRange || dateRange);
      
      const requestBody = { 
        manual_trigger: true,
        winery_id: wineryProfile.id,
        date_range: customDateRange || dateRange
      };
      
      // Call the scan-local-events function (now processes Apify data)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      console.log('Apify pipeline result:', result);

      if (result.success) {
        const startDate = new Date(result.date_range?.start || dateRange.start_date);
        const endDate = new Date(result.date_range?.end || dateRange.end_date);
        const dateRangeText = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        
        if (result.events_final > 0) {
          toast.success(`🎉 Apify Pipeline: Found ${result.events_final} real events (${dateRangeText}) from ${result.raw_events_processed} Apify sources!`);
        } else if (result.events_extracted > 0) {
          toast.success(`✅ Apify Pipeline: Found ${result.events_extracted} events but ${result.competitor_events_filtered} were competitor events (filtered out).`);
        } else if (result.raw_events_processed > 0) {
          toast.success(`✅ Apify Pipeline: Processed ${result.raw_events_processed} sources for ${dateRangeText}! No new relevant events found.`);
        } else {
          toast.success(`ℹ️ No new Apify data to process. Run Apify scraper first or wait for scheduled run.`);
        }
        
        // Show pipeline status
        if (result.apify_pipeline_status) {
          console.log('Apify pipeline status:', result.apify_pipeline_status);
        }
      } else {
        toast.error(`❌ Pipeline failed: ${result.error || 'Unknown error'}`);
      }
      
      // Refresh data after a short delay
      setTimeout(async () => {
        await fetchProactiveEvents();
        await fetchStats();
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering Apify pipeline:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          toast.error('Event processing function not found. Please check your Supabase Edge Functions deployment.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error('Authentication error. Please check your Supabase configuration.');
        } else {
          toast.error(`Pipeline failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to trigger event processing. Please try again.');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleDateRangeScan = () => {
    setShowDateRangeModal(false);
    triggerManualScan(dateRange);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      // First, delete any associated content
      const { error: contentError } = await supabase
        .from('content_calendar')
        .delete()
        .eq('research_brief_id', deletingEvent.id);

      if (contentError) {
        console.warn('Error deleting associated content:', contentError);
      }

      // Then delete the research brief
      const { error } = await supabase
        .from('research_briefs')
        .delete()
        .eq('id', deletingEvent.id);

      if (error) throw error;
      
      setEvents(prev => prev.filter(event => event.id !== deletingEvent.id));
      toast.success('Event and associated content deleted successfully');
      setShowDeleteModal(false);
      setDeletingEvent(null);
      
      // Refresh stats
      await fetchStats();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const openDeleteModal = (event: ProactiveEvent) => {
    setDeletingEvent(event);
    setShowDeleteModal(true);
    setActiveDropdown(null);
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

  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  };

  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
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
          <p className="text-gray-600">Professional-grade event discovery with Apify + AI pipeline</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowApifySetupInfo(true)}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Workflow className="h-4 w-4 mr-2" />
            Apify Setup
          </button>
          <button
            onClick={() => setShowDateRangeModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Date Range Scan
          </button>
          <button
            onClick={() => setShowScheduleSettings(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Schedule
          </button>
          <button
            onClick={() => triggerManualScan()}
            disabled={scanning}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-colors shadow-lg"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Pipeline...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Process Apify Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Apify Pipeline Architecture */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Workflow className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">🚀 DEFINITIVE SOLUTION: Apify Pipeline Architecture</h3>
            <p className="text-sm text-gray-600">
              Professional two-stage pipeline: Apify handles scraping, our AI handles intelligent filtering
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-purple-600 font-semibold text-xs">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Apify Data Acquisition</p>
              <p className="text-gray-600">Professional scraping service handles ALL 11 sources on schedule, stores raw data reliably</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">AI Processing</p>
              <p className="text-gray-600">Our function processes clean Apify data with smart competitor filtering and date extraction</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 font-semibold text-xs">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">User Control</p>
              <p className="text-gray-600">Research briefs created for real events - you choose which ones to create content for</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pipeline Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Apify Pipeline Status</p>
              <p className="text-sm text-gray-600">
                {stats.rawEventsCount > 0 ? (
                  <>
                    {stats.rawEventsCount} raw data entries • {stats.processedEventsCount} processed • {stats.rawEventsCount - stats.processedEventsCount} pending
                  </>
                ) : (
                  'No Apify data found - configure Apify scraper first'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {stats.rawEventsCount > stats.processedEventsCount ? (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {stats.rawEventsCount - stats.processedEventsCount} pending
              </span>
            ) : (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Up to date
              </span>
            )}
            <button
              onClick={() => setShowApifySetupInfo(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Setup Guide
            </button>
          </div>
        </div>
      </motion.div>

      {/* Current Date Range Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Current Processing Range</p>
              <p className="text-sm text-gray-600">
                {new Date(dateRange.start_date).toLocaleDateString()} to {new Date(dateRange.end_date).toLocaleDateString()}
                <span className="ml-2 text-blue-600">
                  ({Math.ceil((new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime()) / (1000 * 60 * 60 * 24))} days)
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDateRangeModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Change Range
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
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
          transition={{ delay: 0.5 }}
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
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Last Processing</p>
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
        transition={{ delay: 0.7 }}
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
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        APIFY PIPELINE
                      </span>
                      {event.event_url && (
                        <a
                          href={event.event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
                          title="Visit event page"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit Event
                        </a>
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
                    
                    {event.key_points && event.key_points.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Key Details:</p>
                        <div className="flex flex-wrap gap-1">
                          {event.key_points.slice(0, 3).map((point, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                              {point.length > 30 ? `${point.substring(0, 30)}...` : point}
                            </span>
                          ))}
                          {event.key_points.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{event.key_points.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Discovered {formatTimeAgo(event.created_at)} via Apify Pipeline + AI filtering
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {event.content_count > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    
                    <div className="relative">
                      <button 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => setActiveDropdown(activeDropdown === event.id ? null : event.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {activeDropdown === event.id && (
                        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                          {event.event_url && (
                            <a
                              href={event.event_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Visit Event
                            </a>
                          )}
                          <button
                            onClick={() => openDeleteModal(event)}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No events discovered yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Set up Apify scraper first, then click "Process Apify Data" to discover real local events
            </p>
          </div>
        )}
      </motion.div>

      {/* Schedule Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Automated Apify Pipeline Schedule</h3>
              <p className="text-sm text-gray-600">
                {scheduleSettings.enabled ? (
                  <>
                    Apify scrapes ALL sources automatically, then our pipeline processes the data every {getDayName(scheduleSettings.day_of_week)} at {formatTime(scheduleSettings.hour)} ({scheduleSettings.timezone}).
                    When relevant events are found, research briefs are created (no automatic content generation).
                  </>
                ) : (
                  'Automatic processing is currently disabled. Use manual processing or enable scheduling.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowScheduleSettings(true)}
            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            Configure
          </button>
        </div>
      </motion.div>

      {/* Apify Setup Info Modal */}
      {showApifySetupInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Workflow className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Apify Pipeline Setup Guide</h3>
                <p className="text-sm text-gray-600">Complete setup instructions for the professional Event Engine</p>
              </div>
            </div>
            
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="border-l-4 border-purple-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">1</span>
                  Sign Up for Apify
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Visit <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">apify.com</a> and create a free account</p>
                  <p>• The free plan includes 1,000 compute units per month (sufficient for daily scraping)</p>
                  <p>• Navigate to the Apify Store and search for "Web Scraper"</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-4 border-blue-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">2</span>
                  Configure the Web Scraper
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">Start URLs (paste all 11 sources):</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
                      <div>https://www.visitloudoun.org/event/rss/</div>
                      <div>https://www.fxva.com/rss/</div>
                      <div>https://www.virginia.org/feeds/events/</div>
                      <div>https://www.visitpwc.com/events/rss</div>
                      <div>https://visitfauquier.com/all-events/feed/</div>
                      <div>https://northernvirginiamag.com/events/feed/</div>
                      <div>https://www.discoverclarkecounty.com/events/feed/</div>
                      <div>https://www.fxva.com/events/</div>
                      <div>https://www.virginia.org/events/</div>
                      <div>https://www.fauquiercounty.gov/government/calendar</div>
                      <div>https://www.warrencountyva.gov/events</div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">Page Function (copy this code):</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
                      <pre>{`async function pageFunction(context) {
    const { page, request } = context;
    
    // Get the page content
    const content = await page.content();
    
    return {
        source_url: request.url,
        source_name: request.url.includes('visitloudoun') ? 'Visit Loudoun Events RSS' :
                    request.url.includes('fxva.com/rss') ? 'FXVA Events RSS' :
                    request.url.includes('virginia.org/feeds') ? 'Virginia Tourism Events RSS' :
                    request.url.includes('visitpwc') ? 'Prince William County Events RSS' :
                    request.url.includes('visitfauquier') ? 'Visit Fauquier Events RSS' :
                    request.url.includes('northernvirginiamag') ? 'Northern Virginia Magazine Events RSS' :
                    request.url.includes('discoverclarkecounty') ? 'Discover Clarke County Events RSS' :
                    request.url.includes('fxva.com/events') ? 'FXVA Events HTML' :
                    request.url.includes('virginia.org/events') ? 'Virginia Tourism Events HTML' :
                    request.url.includes('fauquiercounty.gov') ? 'Fauquier County Government Calendar' :
                    request.url.includes('warrencountyva.gov') ? 'Warren County Events' :
                    request.url,
        raw_content: content,
        scrape_timestamp: new Date().toISOString()
    };
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-4 border-green-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
                  Set Up Webhook Integration
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• In the scraper's "Integrations" tab, add a new "Webhook" integration</p>
                  <p>• Set the webhook URL to: <code className="bg-gray-200 px-1 rounded">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-raw-events</code></p>
                  <p>• Set the HTTP method to "POST"</p>
                  <p>• This will automatically send scraped data to your Event Engine</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="border-l-4 border-amber-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">4</span>
                  Schedule Regular Runs
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• In the scraper settings, set up a schedule (e.g., daily at 6 AM)</p>
                  <p>• Recommended: Run once per day to capture new events</p>
                  <p>• The scraper will automatically feed data to your Event Engine</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="border-l-4 border-indigo-500 pl-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">5</span>
                  Test and Monitor
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Run the scraper manually first to test the setup</p>
                  <p>• Check that data appears in your Event Engine pipeline status</p>
                  <p>• Use "Process Apify Data" button to analyze the scraped content</p>
                  <p>• Monitor the Apify dashboard for scraping success/failures</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Why This Architecture Works</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• <strong>Reliability:</strong> Apify handles all the complex web scraping professionally</p>
                  <p>• <strong>Separation of Concerns:</strong> Data acquisition is separate from AI processing</p>
                  <p>• <strong>Scalability:</strong> Can easily add more sources or increase frequency</p>
                  <p>• <strong>Debugging:</strong> Clear separation makes troubleshooting much easier</p>
                  <p>• <strong>Professional Grade:</strong> Industry-standard approach used by data companies</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-8">
              <a
                href="https://apify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
              >
                Sign Up for Apify
              </a>
              <button
                onClick={() => setShowApifySetupInfo(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close Guide
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Date Range Modal */}
      {showDateRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Custom Date Range Processing</h3>
                <p className="text-sm text-gray-600">Process Apify data for events in a specific date range</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Duration:</strong> {Math.ceil((new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Recommended: 1-6 months for best results
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDateRangeModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDateRangeScan}
                disabled={scanning}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Database className="h-4 w-4 mr-2" />
                {scanning ? 'Processing...' : 'Process Range'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Schedule Settings Modal */}
      {showScheduleSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Schedule Settings</h3>
                <p className="text-sm text-gray-600">Configure when the Event Engine processes Apify data automatically</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Enable Automatic Processing
                </label>
                <input
                  type="checkbox"
                  checked={scheduleSettings.enabled}
                  onChange={(e) => setScheduleSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              
              {scheduleSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Week
                    </label>
                    <select
                      value={scheduleSettings.day_of_week}
                      onChange={(e) => setScheduleSettings(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <select
                      value={scheduleSettings.hour}
                      onChange={(e) => setScheduleSettings(prev => ({ ...prev, hour: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatTime(i)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={scheduleSettings.timezone}
                      onChange={(e) => setScheduleSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowScheduleSettings(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveScheduleSettings}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                <p className="text-sm text-gray-600">This will also delete any associated content</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete this event and all its associated content?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900 text-sm">{deletingEvent.local_event_name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {deletingEvent.local_event_date ? formatDate(deletingEvent.local_event_date) : 'Date TBD'} • {deletingEvent.local_event_location}
                </p>
                {deletingEvent.content_count > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ This will delete {deletingEvent.content_count} associated content piece(s)
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingEvent(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}