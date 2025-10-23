// This component has been deprecated and is no longer in use.
// The meeting scheduling functionality has been integrated into the LeadDetailModal component.
import React from 'react';

const Meetings: React.FC = () => {
  return (
    <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Meetings Page Deprecated</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
            This page is no longer in use. Meeting scheduling is now handled within the details modal on the Lead List page.
        </p>
    </div>
  );
};

export default Meetings;
