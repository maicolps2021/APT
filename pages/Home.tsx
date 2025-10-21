import React from 'react';
import Card from '../components/Card';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">Arenal Private Tours</span>
        </h1>
        <p className="text-md md:text-lg text-gray-500 dark:text-gray-400 -mt-2 mb-4">
          Operated by Small Groups La Fortuna Private Tours
        </p>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
          The central hub for event management. Capture leads, view real-time data, and engage attendees like never before.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-8">
        <a href="#/capture" className="transform hover:scale-105 transition-transform duration-300">
          <Card className="h-full">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Capture Leads</h2>
            <p className="text-gray-500 dark:text-gray-400">A streamlined form to quickly register new leads and generate a unique QR code for them.</p>
          </Card>
        </a>
        <a href="#/leads" className="transform hover:scale-105 transition-transform duration-300">
          <Card className="h-full">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Lead List</h2>
            <p className="text-gray-500 dark:text-gray-400">View all captured leads in a real-time, comprehensive list with search and filtering capabilities.</p>
          </Card>
        </a>
        <a href="#/tv" className="transform hover:scale-105 transition-transform duration-300">
          <Card className="h-full">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">TV Display</h2>
            <p className="text-gray-500 dark:text-gray-400">An engaging public display showcasing new attendees with AI-powered welcome messages.</p>
          </Card>
        </a>
      </div>
    </div>
  );
};

export default Home;