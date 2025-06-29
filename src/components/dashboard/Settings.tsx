import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, TestTube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SettingsProps {
  wineryProfile: any;
  onProfileUpdate: (profile: any) => void;
}

export function Settings({ wineryProfile, onProfileUpdate }: SettingsProps) {
  const [formData, setFormData] = useState({
    winery_name: '',
    owner_name: '',
    location: '',
    brand_tone: '',
    backstory: '',
    target_audience: '',
    wine_types: '',
    content_goals: 3,
    wordpress_url: '',
    wordpress_username: '',
    wordpress_password: ''
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (wineryProfile) {
      setFormData({
        winery_name: wineryProfile.winery_name || '',
        owner_name: wineryProfile.owner_name || '',
        location: wineryProfile.location || '',
        brand_tone: wineryProfile.brand_tone || '',
        backstory: wineryProfile.backstory || '',
        target_audience: wineryProfile.target_audience || '',
        wine_types: wineryProfile.wine_types?.join(', ') || '',
        content_goals: wineryProfile.content_goals || 3,
        wordpress_url: wineryProfile.wordpress_url || '',
        wordpress_username: wineryProfile.wordpress_username || '',
        wordpress_password: wineryProfile.wordpress_password || ''
      });
    }
  }, [wineryProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        ...formData,
        wine_types: formData.wine_types.split(',').map(type => type.trim()).filter(Boolean)
      };

      const { data, error } = await supabase
        .from('winery_profiles')
        .update(updateData)
        .eq('id', wineryProfile.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testWordPressConnection = async () => {
    if (!formData.wordpress_url || !formData.wordpress_username || !formData.wordpress_password) {
      toast.error('Please fill in all WordPress credentials');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-wordpress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wordpress_url: formData.wordpress_url,
          wordpress_username: formData.wordpress_username,
          wordpress_password: formData.wordpress_password
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('WordPress connection successful!');
      } else {
        toast.error(result.error || 'WordPress connection failed');
      }
    } catch (error) {
      console.error('Error testing WordPress connection:', error);
      toast.error('Failed to test WordPress connection');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your winery profile and integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Winery Profile */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Winery Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Winery Name
              </label>
              <input
                type="text"
                value={formData.winery_name}
                onChange={(e) => setFormData(prev => ({ ...prev, winery_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Napa Valley, California"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wine Types
              </label>
              <input
                type="text"
                value={formData.wine_types}
                onChange={(e) => setFormData(prev => ({ ...prev, wine_types: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Cabernet Sauvignon, Chardonnay, Pinot Noir"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple wines with commas</p>
            </div>
          </div>
        </motion.div>

        {/* Brand Voice */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Voice</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Voice
              </label>
              <select
                value={formData.brand_tone}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_tone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select brand voice...</option>
                <option value="elegant">Elegant & Sophisticated</option>
                <option value="approachable">Approachable & Friendly</option>
                <option value="traditional">Traditional & Heritage</option>
                <option value="modern">Modern & Innovative</option>
                <option value="rustic">Rustic & Authentic</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backstory
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Tell your winery's unique story..."
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 50 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <textarea
                value={formData.target_audience}
                onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Describe your ideal customers..."
              />
            </div>
          </div>
        </motion.div>

        {/* Content Goals */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Goals</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posts per Week
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.content_goals}
                onChange={(e) => setFormData(prev => ({ ...prev, content_goals: parseInt(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-amber-600 min-w-[2rem]">
                {formData.content_goals}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              How many pieces of content do you want to publish per week?
            </p>
          </div>
        </motion.div>

        {/* WordPress Integration */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">WordPress Integration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WordPress URL
              </label>
              <input
                type="url"
                value={formData.wordpress_url}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="https://yourwinery.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.wordpress_username}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.wordpress_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, wordpress_password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Create an application password in WordPress Admin → Users → Profile
              </p>
            </div>
            
            <button
              onClick={testWordPressConnection}
              disabled={testingConnection}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </motion.div>
    </div>
  );
}