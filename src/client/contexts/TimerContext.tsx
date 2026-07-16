import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { kv } from '../lib/kv';

interface TimerContextType {
  activeTaskId: string | null;
  activeTaskContent: string | null;
  taskElapsedTimes: Record<string, number>;
  startTimer: (taskId: string, content: string, scopeKey: string) => void;
  stopTimer: () => void;
  setTaskElapsedTimes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  formatTime: (totalSeconds: number) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskContent, setActiveTaskContent] = useState<string | null>(null);
  const [activeScopeKey, setActiveScopeKey] = useState<string>('');
  const [taskElapsedTimes, setTaskElapsedTimes] = useState<Record<string, number>>({});

  // Active Timer Interval & Auto-save to KV
  useEffect(() => {
    if (!activeTaskId || !activeScopeKey) return;

    let secondsRunning = 0;
    const interval = setInterval(() => {
      setTaskElapsedTimes((prev) => {
        const nextTime = (prev[activeTaskId] || 0) + 1;
        secondsRunning += 1;
        
        // Auto-save to KV every 10 seconds
        if (secondsRunning % 10 === 0) {
          kv.get(activeScopeKey).then((currentTimers = {}) => {
            currentTimers[activeTaskId] = nextTime;
            kv.set(activeScopeKey, currentTimers);
          }).catch(console.error);
        }

        return { ...prev, [activeTaskId]: nextTime };
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (activeTaskId && activeScopeKey) {
        setTaskElapsedTimes((current) => {
          const finalTime = current[activeTaskId] || 0;
          kv.get(activeScopeKey).then((currentTimers = {}) => {
            currentTimers[activeTaskId] = finalTime;
            kv.set(activeScopeKey, currentTimers);
          }).catch(console.error);
          return current;
        });
      }
    };
  }, [activeTaskId, activeScopeKey]);

  // Update browser tab title dynamically
  useEffect(() => {
    const originalTitle = 'ApexScholar';
    if (activeTaskId && activeTaskContent) {
      const elapsed = taskElapsedTimes[activeTaskId] || 0;
      const formatted = formatTime(elapsed);
      document.title = `[▶ ${formatted}] ${activeTaskContent}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [activeTaskId, activeTaskContent, taskElapsedTimes]);

  const startTimer = async (taskId: string, content: string, scopeKey: string) => {
    // If there was a running timer on a DIFFERENT task, save its value first
    if (activeTaskId && activeTaskId !== taskId && activeScopeKey) {
      try {
        const currentTimers = (await kv.get(activeScopeKey)) || {};
        currentTimers[activeTaskId] = taskElapsedTimes[activeTaskId] || 0;
        await kv.set(activeScopeKey, currentTimers);
      } catch (err) {
        console.error('Failed to save old timer to KV', err);
      }
    }

    setActiveTaskId(taskId);
    setActiveTaskContent(content);
    setActiveScopeKey(scopeKey);
  };

  const stopTimer = () => {
    setActiveTaskId(null);
    setActiveTaskContent(null);
  };

  const value = useMemo(
    () => ({
      activeTaskId,
      activeTaskContent,
      taskElapsedTimes,
      startTimer,
      stopTimer,
      setTaskElapsedTimes,
      formatTime,
    }),
    [activeTaskId, activeTaskContent, taskElapsedTimes]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
