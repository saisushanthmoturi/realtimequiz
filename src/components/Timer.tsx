'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  duration: number; // duration in minutes
  onTimeUp: () => void;
  className?: string;
}

export default function Timer({ duration, onTimeUp, className = '' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // convert to seconds
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => {
          if (timeLeft <= 1) {
            setIsActive(false);
            onTimeUp();
            return 0;
          }
          return timeLeft - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      onTimeUp();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeLeft / (duration * 60)) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressPercentage = () => {
    return ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        {/* Circular Progress */}
        <div className="w-16 h-16">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className={getTimerColor()}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${getProgressPercentage()}, 100`}
            />
          </svg>
        </div>
        
        {/* Timer Text Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${getTimerColor()}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
      
      {/* Status Text */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
        <span className={`text-xs ${getTimerColor()}`}>
          {timeLeft <= 60 ? 'Hurry up!' : timeLeft <= 300 ? '5 minutes left' : 'Keep going!'}
        </span>
      </div>
    </div>
  );
}
