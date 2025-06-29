import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const handleComplete = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Winery Content Engine
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let's set up your winery profile
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <p className="text-center text-gray-700">
                Step {currentStep} of 3: Getting started
              </p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleComplete}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Complete Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}