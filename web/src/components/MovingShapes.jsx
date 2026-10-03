import React from 'react';

const MovingShapes = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div 
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary-500/15 to-transparent blur-3xl animate-pulse" 
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-accent-500/15 to-transparent blur-3xl animate-pulse" 
        style={{ animationDelay: '1.5s' }} 
      />
      <div 
        className="absolute top-[35%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-bl from-cyan-500/10 to-transparent blur-2xl animate-pulse" 
        style={{ animationDelay: '3s' }} 
      />
    </div>
  );
};

export default MovingShapes;
