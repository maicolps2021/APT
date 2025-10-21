
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
