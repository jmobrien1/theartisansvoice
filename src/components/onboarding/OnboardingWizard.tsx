import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const steps = [
  { id: 1, title: 'Winery Details', description: 'Tell us about your winery' },
  { id: 2, title: 'Brand Voice', description: 'Define your unique voice' },
  { id: 3, title: 'Products & Audience', description: 'Your wines and customers' },
  { id: 4, title: 'Content Goals', description: 'Set your publishing targets' },
  { id: 5, title: 'WordPress Integration', description: 'Connect your website (optional)' }
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    winery_name: '',
    owner_name: '',
    location: '',
    brand_tone: '',
    backstory: '',
    wine_types: [] as string[],
    target_audience: '',
    content_goals: 3,
    wordpress_url: '',
    wordpress_username: '',
    wordpress_password: ''
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('winery_profiles')
        .insert([{
          user_id: user.id,
          ...formData
        }]);

      if (error) throw error;

      toast.success('Welcome to your Winery Content Engine!');
      navigate('/');
    } catch (error) {
      console.error('Error creating winery profile:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.winery_name && formData.owner_name && formData.location;
      case 2:
        return formData.brand_tone && formData.backstory.length >= 50;
      case 3:
        return formData.wine_types.length > 0 && formData.target_audience;
      case 4:
        return formData.content_goals >= 1;
      case 5:
        // WordPress integration is completely optional
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Winery Name *
              </label>
              <input
                type="text"
                value={formData.winery_name}
                onChange={(e) => setFormData(prev => ({ ...prev, winery_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter your winery name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name *
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Napa Valley, California"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Voice *
              </label>
              <select
                value={formData.brand_tone}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_tone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select your brand voice...</option>
                <option value="elegant">Elegant & Sophisticated</option>
                <option value="approachable">Approachable & Friendly</option>
                <option value="traditional">Traditional & Heritage</option>
                <option value="modern">Modern & Innovative</option>
                <option value="rustic">Rustic & Authentic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Winery's Story * (minimum 50 characters)
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Tell us about your winery's history, philosophy, and what makes you unique..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.backstory.length}/50 characters minimum
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wine Types * (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Cabernet Sauvignon', 'Chardonnay', 'Pinot Noir', 'Merlot',
                  'Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Syrah',
                  'Zinfandel', 'Sangiovese', 'Tempranillo', 'Other'
                ].map((wine) => (
                  <label key={wine} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.wine_types.includes(wine)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            wine_types: [...prev.wine_types, wine]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            wine_types: prev.wine_types.filter(w => w !== wine)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{wine}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience *
              </label>
              <textarea
                value={formData.target_audience}
                onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Describe your ideal customers (age, interests, wine knowledge level, etc.)"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Publishing Goal
              </label>
              <p className="text-sm text-gray-600 mb-4">
                How many pieces of content would you like to publish per week?
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.content_goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_goals: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">10</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-2xl font-bold text-amber-600">
                  {formData.content_goals}
                </span>
                <span className="text-sm text-gray-600 ml-1">
                  posts per week
                </span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Optional:</strong> Connect your WordPress website to automatically publish content.
                You can skip this step and set it up later in Settings.
              </p>
            </div>
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
              <input
                type="password"
                value={formData.wordpress_password}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Create an application password in WordPress Admin → Users → Profile
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          {renderStep()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>

            <span className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </span>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className="flex items-center px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
                <Check className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}