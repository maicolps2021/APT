
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
      <nav className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <a href="#/" className="text-2xl font-bold text-white tracking-tight">
          Arenal <span className="text-primary-500">Conagui</span>
        </a>
        <div className="space-x-4 md:space-x-6 text-sm md:text-base">
          <a href="#/" className="text-slate-300 hover:text-primary-400 transition-colors">Home</a>
          <a href="#/capture" className="text-slate-300 hover:text-primary-400 transition-colors">Capture Lead</a>
          <a href="#/leads" className="text-slate-300 hover:text-primary-400 transition-colors">Lead List</a>
          <a href="#/meetings" className="text-slate-300 hover:text-primary-400 transition-colors">Meetings</a>
          <a href="#/kpis" className="text-slate-300 hover:text-primary-400 transition-colors">KPIs</a>
          <a href="#/raffles" className="text-slate-300 hover:text-primary-400 transition-colors">Raffles</a>
          <a href="#/materials" className="text-slate-300 hover:text-primary-400 transition-colors">Materials</a>
          <a href="#/tv" className="text-slate-300 hover:text-primary-400 transition-colors">TV Display</a>
        </div>
      </nav>
    </header>
  );
};

export default Header;