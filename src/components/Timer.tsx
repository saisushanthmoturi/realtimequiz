'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  duration?: number; // duration in minutes
  initialSeconds?: number; // initial seconds
  onTimeUpAction?: () => void;
  isActive?: boolean;
  className?: string;
  showProgressBar?: boolean;
}

export default function Timer({ 
  duration, 
  initialSeconds,
  onTimeUpAction = () => {}, 
  isActive = true,
  className = '',
  showProgressBar = true
}: TimerProps) {
  // Initialize with either initialSeconds or convert duration from minutes
  const totalInitialSeconds = initialSeconds !== undefined ? initialSeconds : (duration || 0) * 60;
  const [timeLeft, setTimeLeft] = useState(totalInitialSeconds);

  // Update timer when external time changes (for real-time sync)
  useEffect(() => {
    if (initialSeconds !== undefined) {
      setTimeLeft(initialSeconds);
    } else if (duration !== undefined) {
      setTimeLeft(duration * 60);
    }
  }, [initialSeconds, duration]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Only run local countdown if we're not getting real-time updates (initialSeconds is undefined)
    if (isActive && timeLeft > 0 && initialSeconds === undefined) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => {
          if (timeLeft <= 1) {
            onTimeUpAction();
            return 0;
          }
          return timeLeft - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      onTimeUpAction();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onTimeUpAction, initialSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeLeft / totalInitialSeconds) * 100;
    if (percentage > 50) return 'text-green-400';
    if (percentage > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressPercentage = () => {
    return Math.max(0, Math.min(100, ((totalInitialSeconds - timeLeft) / totalInitialSeconds) * 100));
  };

  const getProgressColor = () => {
    const percentage = (timeLeft / totalInitialSeconds) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="font-mono text-2xl font-bold">
        <span className={getTimerColor()}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Progress bar */}
      {showProgressBar && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700">
          <div 
            className={`h-full rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      )}
    </div>
  );
}
