
import React from 'react';
import Card from '../components/Card';
import { EVENT_CODE, ORG_UUID, EVENT_DATES, WHATSAPP, TV_PREFIX } from '../lib/config';
import { hasBuilderBot } from '../services/builderbotService';
import { hasGemini } from '../lib/ai';
import { CheckCircle, XCircle } from 'lucide-react';

// FIX: Create a valid Settings component to display read-only configuration details.
const Settings: React.FC = () => {

  const StatusIndicator: React.FC<{ isEnabled: boolean; label: string }> = ({ isEnabled, label }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg ${isEnabled ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
      <span className={`font-medium ${isEnabled ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{label}</span>
      {isEnabled ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Settings & Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Current application settings loaded from environment variables. These are read-only.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b dark:border-gray-700 pb-2">Event Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-300">Organization ID (ORG_UUID):</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">{ORG_UUID}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-300">Event Code:</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">{EVENT_CODE}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-300">Event Dates:</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">{EVENT_DATES}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-300">Contact WhatsApp:</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">{WHATSAPP}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-300">TV Playlist Prefix:</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">{TV_PREFIX}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b dark:border-gray-700 pb-2">API Integrations Status</h2>
          <div className="space-y-3">
            <StatusIndicator isEnabled={hasGemini()} label="Google Gemini AI" />
            <StatusIndicator isEnabled={hasBuilderBot()} label="BuilderBot WhatsApp API" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
