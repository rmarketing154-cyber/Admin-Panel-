/**
 * Utility functions for 3-Shift Countdown system:
 * - Shift 1: রিপোর্ট দেওয়া হবে (Report Time)
 * - Shift 2: রিসিভ করা হবে (Receive Time)
 * - Shift 3: এডমিন টাইম (Admin Time)
 *
 * Each shift supports setting Days (d), Hours (h), Minutes (m) and an optional custom label.
 * - When active (running): counts down accurately from configured total duration since startTimeMs.
 * - When time reaches 0 (duration finishes): freezes strictly at "00:00:00" and never repeats.
 * - When inactive (timer stopped/off): stays strictly at "00:00:00".
 */

export interface ShiftTimerData {
  title: string;
  days: number;
  hours: number;
  minutes: number;
  startTime: number;
  active: boolean;
}

export interface CountdownResult {
  timeStr: string;
  isFinished: boolean;
  remainingMs: number;
  daysLeft: number;
  hoursLeft: number;
  minsLeft: number;
  secsLeft: number;
}

export function computeDurationCountdown(
  days: number,
  hours: number,
  minutes: number,
  startTimeMs: number,
  isEnabled: boolean
): CountdownResult {
  if (!isEnabled) {
    return {
      timeStr: '00:00:00',
      isFinished: false,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
    };
  }

  const totalHours = (days || 0) * 24 + (hours || 0);
  const totalDurationMs =
    (totalHours * 3600 + (minutes || 0) * 60) * 1000;

  if (totalDurationMs <= 0) {
    return {
      timeStr: '00:00:00',
      isFinished: true,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
    };
  }

  const now = Date.now();
  const effectiveStart = startTimeMs > 0 ? startTimeMs : now;
  const elapsedMs = now - effectiveStart;

  // Non-looping countdown: If time has passed total duration, freeze at 00:00:00
  if (elapsedMs >= totalDurationMs) {
    return {
      timeStr: '00:00:00',
      isFinished: true,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
    };
  }

  const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
  const totalSecs = Math.floor(remainingMs / 1000);

  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return {
    timeStr,
    isFinished: false,
    remainingMs,
    daysLeft: 0,
    hoursLeft: h,
    minsLeft: m,
    secsLeft: s,
  };
}

export function formatDurationLabel(
  days: number,
  hours: number,
  minutes: number
): string {
  const totalHours = (days || 0) * 24 + (hours || 0);
  const parts: string[] = [];
  if (totalHours > 0) parts.push(`${totalHours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) return '00:00:00';
  return parts.join(' ');
}
