import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  PenTool, 
  Target, 
  Send,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { ContentRequestModal, ContentRequest } from './ContentRequestModal';

interface AIAgentsProps {
  wineryProfile: any;
}

const agents = [
  {
    id: 'terroir-research',
    name: 'Terroir Research Agent',
    description: 'Discovers local events, seasonal trends, and regional wine topics',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'vintage-strategist',
    name: 'Vintage Strategist Agent',
    description: 'Creates comprehensive content strategies and editorial calendars',
    icon: Target,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'sommelier-writer',
    name: 'Sommelier Writing Agent',
    description: 'Generates engaging wine content with your unique brand voice',
    icon: PenTool,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  {
    id: 'cellar-master',
    name: 'Cellar Master Publishing Agent',
    description: 'Automatically publishes content to your WordPress website',
    icon: Send,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
];

export function AIAgents({ wineryProfile }: AIAgentsProps) {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>({});
  const [showContentRequest, setShowContentRequest] = useState(false);
  const [selectedAgentForRequest, setSelectedAgentForRequest] = useState<string | null>(null);

  const runAgent = async (agentId: string, contentRequest?: ContentRequest) => {
    setLoading(agentId);
    setActiveAgent(agentId);

    try {
      const requestBody: any = {
        winery_id: wineryProfile.id,
        winery_profile: wineryProfile
      };

      // Add content request data if provided
      if (contentRequest) {
        requestBody.content_request = contentRequest;
      }

      // Simulate API call to Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${agentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Parse the response body first
      const result = await response.json();

      if (!response.ok) {
        // Use the specific error message from the API response
        const errorMessage = result.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      setResults(prev => ({ ...prev, [agentId]: result }));
    } catch (error) {
      console.error(`Error running ${agentId}:`, error);
      setResults(prev => ({ 
        ...prev, 
        [agentId]: { 
          error: error instanceof Error ? error.message : 'Failed to run agent. Please check your configuration.' 
        } 
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleContentRequest = (agentId: string) => {
    setSelectedAgentForRequest(agentId);
    setShowContentRequest(true);
  };

  const handleContentRequestSubmit = async (contentRequest: ContentRequest) => {
    if (selectedAgentForRequest) {
      await runAgent(selectedAgentForRequest, contentRequest);
      setShowContentRequest(false);
      setSelectedAgentForRequest(null);
    }
  };

  const getAgentStatus = (agentId: string) => {
    if (loading === agentId) return 'running';
    if (results[agentId]?.error) return 'error';
    if (results[agentId]) return 'success';
    return 'idle';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-amber-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Intelligent assistants to automate your content creation workflow</p>
        </div>
        <button
          onClick={() => handleContentRequest('sommelier-writer')}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Content Request
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const status = getAgentStatus(agent.id);
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${agent.bgColor} rounded-xl border ${agent.borderColor} p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${agent.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status)}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {agent.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {agent.description}
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => runAgent(agent.id)}
                  disabled={loading === agent.id}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loading === agent.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {loading === agent.id ? 'Running...' : 'Quick Run'}
                </button>
                
                {agent.id === 'sommelier-writer' && (
                  <button
                    onClick={() => handleContentRequest(agent.id)}
                    disabled={loading === agent.id}
                    className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Results */}
              {results[agent.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                  {results[agent.id].error ? (
                    <div className="text-red-600 text-sm">
                      <p className="font-medium">Error:</p>
                      <p>{results[agent.id].error}</p>
                      {results[agent.id].error.includes('WordPress configuration') && (
                        <p className="mt-2 text-blue-600">
                          <span className="font-medium">Tip:</span> Configure your WordPress settings in the Settings tab to use this agent.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-green-600 text-sm">
                      <p className="font-medium">Success!</p>
                      <p>Agent completed successfully. Check your content pipeline for results.</p>
                      {results[agent.id].data?.content && (
                        <p className="mt-1 text-gray-600">
                          Created: "{results[agent.id].data.content.title}"
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Agent Workflow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use AI Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Quick Run</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Research & Strategy</p>
                  <p className="text-xs text-gray-600">Use Terroir Research and Vintage Strategist for general content ideas</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Generate Content</p>
                  <p className="text-xs text-gray-600">Quick run creates generic content based on your brand voice</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Content Request (Recommended)</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Specific Assignment</p>
                  <p className="text-xs text-gray-600">Tell the AI exactly what content you need</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Targeted Results</p>
                  <p className="text-xs text-gray-600">Get content that matches your exact requirements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content Request Modal */}
      <ContentRequestModal
        isOpen={showContentRequest}
        onClose={() => {
          setShowContentRequest(false);
          setSelectedAgentForRequest(null);
        }}
        onSubmit={handleContentRequestSubmit}
        loading={loading === selectedAgentForRequest}
      />
    </div>
  );
}