import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ContentEditor } from '../content/ContentEditor';

interface ContentPipelineProps {
  wineryProfile: any;
}

type ContentStatus = 'draft' | 'ready_for_review' | 'scheduled' | 'published';

const statusColumns = [
  { id: 'draft', title: 'Draft', color: 'bg-gray-100 border-gray-300' },
  { id: 'ready_for_review', title: 'Ready for Review', color: 'bg-blue-100 border-blue-300' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-amber-100 border-amber-300' },
  { id: 'published', title: 'Published', color: 'bg-green-100 border-green-300' }
] as const;

export function ContentPipeline({ wineryProfile }: ContentPipelineProps) {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);

  useEffect(() => {
    if (wineryProfile) {
      fetchContent();
    }
  }, [wineryProfile]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_calendar')
        .select('*')
        .eq('winery_id', wineryProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (contentId: string, newStatus: ContentStatus) => {
    try {
      const { error } = await supabase
        .from('content_calendar')
        .update({ status: newStatus })
        .eq('id', contentId);

      if (error) throw error;
      
      // Update local state
      setContent(prev => prev.map(item => 
        item.id === contentId ? { ...item, status: newStatus } : item
      ));
    } catch (error) {
      console.error('Error updating content status:', error);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const { error } = await supabase
        .from('content_calendar')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      
      setContent(prev => prev.filter(item => item.id !== contentId));
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.content_type === filterType;
    return matchesSearch && matchesType;
  });

  const getContentByStatus = (status: ContentStatus) => {
    return filteredContent.filter(item => item.status === status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'blog_post':
        return 'bg-purple-100 text-purple-800';
      case 'social_media':
        return 'bg-pink-100 text-pink-800';
      case 'newsletter':
        return 'bg-indigo-100 text-indigo-800';
      case 'press_release':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pipeline</h1>
          <p className="text-gray-600">Manage your content through the editorial workflow</p>
        </div>
        <button
          onClick={() => {
            setEditingContent(null);
            setShowEditor(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="all">All Types</option>
          <option value="blog_post">Blog Posts</option>
          <option value="social_media">Social Media</option>
          <option value="newsletter">Newsletter</option>
          <option value="press_release">Press Release</option>
        </select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {statusColumns.map((column) => {
          const columnContent = getContentByStatus(column.id as ContentStatus);
          
          return (
            <div key={column.id} className="space-y-4">
              <div className={`rounded-lg border-2 border-dashed ${column.color} p-4`}>
                <h3 className="font-semibold text-gray-900 mb-1">{column.title}</h3>
                <p className="text-sm text-gray-600">{columnContent.length} items</p>
              </div>
              
              <div className="space-y-3">
                {columnContent.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setEditingContent(item);
                      setShowEditor(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {item.title}
                      </h4>
                      <div className="relative">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {item.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.content_type)}`}>
                        {item.content_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    
                    {item.scheduled_date && (
                      <div className="mt-2 text-xs text-amber-600">
                        Scheduled: {formatDate(item.scheduled_date)}
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {columnContent.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No content in this stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Editor Modal */}
      {showEditor && (
        <ContentEditor
          content={editingContent}
          wineryProfile={wineryProfile}
          onClose={() => {
            setShowEditor(false);
            setEditingContent(null);
          }}
          onSave={() => {
            fetchContent();
            setShowEditor(false);
            setEditingContent(null);
          }}
        />
      )}
    </div>
  );
}