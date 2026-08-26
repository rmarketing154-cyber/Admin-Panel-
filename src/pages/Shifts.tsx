import React, { useState, useEffect } from 'react';
import { ref, set, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Swal from 'sweetalert2';
import { 
  Clock, 
  Play, 
  Square, 
  RotateCcw, 
  Timer, 
  FileText, 
  Inbox, 
  Layers
} from 'lucide-react';
import { computeDurationCountdown, formatDurationLabel, ShiftTimerData } from '../lib/shiftCountdown';

interface ShiftsProps {
  data: any;
  initialTab?: 'report' | 'receive' | 'all';
}

export default function Shifts({ data, initialTab = 'all' }: ShiftsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'shift1' | 'shift2'>('all');

  // Unit mode switch: 'hours' or 'minutes'
  const [s1Unit, setS1Unit] = useState<'hours' | 'minutes'>('hours');
  const [s2Unit, setS2Unit] = useState<'hours' | 'minutes'>('hours');

  // Shift 1: রিপোর্ট টাইম (Report Time)
  const [shift1, setShift1] = useState<ShiftTimerData>({
    title: 'রিপোর্ট টাইম',
    days: 0,
    hours: 3,
    minutes: 0,
    startTime: Date.now(),
    active: true
  });

  // Shift 2: রিসিভ টাইম (Receive Time)
  const [shift2, setShift2] = useState<ShiftTimerData>({
    title: 'রিসিভ টাইম',
    days: 0,
    hours: 5,
    minutes: 0,
    startTime: Date.now(),
    active: true
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [, setTicker] = useState(0);

  // Live ticking interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync from Firebase
  useEffect(() => {
    // Shift 1
    const s1 = data?.settings?.review_shifts?.shift_1 || data?.shifts?.shift_1 || data?.shifts?.shift1;
    if (s1) {
      let parsedD = Number(s1.days || s1.duration_days || 0);
      let parsedH = s1.hours !== undefined ? Number(s1.hours) : (s1.duration_hours !== undefined ? Number(s1.duration_hours) : 3);
      let parsedM = Number(s1.minutes || s1.duration_minutes || 0);
      let totalH = (isNaN(parsedD) ? 0 : parsedD * 24) + (isNaN(parsedH) ? 3 : parsedH);
      setShift1(prev => ({
        title: s1.title || 'রিপোর্ট টাইম',
        days: 0,
        hours: totalH,
        minutes: isNaN(parsedM) ? 0 : parsedM,
        startTime: s1.startTime || s1.timer_started_at || prev.startTime,
        active: s1.active !== undefined ? Boolean(s1.active) : (data?.settings?.report_time_enabled !== undefined ? Boolean(data.settings.report_time_enabled) : prev.active)
      }));

      // Detect if configured mainly in minutes
      if (totalH === 0 && parsedM > 0) {
        setS1Unit('minutes');
      }
    }

    // Shift 2
    const s2 = data?.settings?.review_shifts?.shift_2 || data?.shifts?.shift_2 || data?.shifts?.shift2;
    if (s2) {
      let parsedD = Number(s2.days || s2.duration_days || 0);
      let parsedH = s2.hours !== undefined ? Number(s2.hours) : (s2.duration_hours !== undefined ? Number(s2.duration_hours) : 5);
      let parsedM = Number(s2.minutes || s2.duration_minutes || 0);
      let totalH = (isNaN(parsedD) ? 0 : parsedD * 24) + (isNaN(parsedH) ? 5 : parsedH);
      setShift2(prev => ({
        title: s2.title || 'রিসিভ টাইম',
        days: 0,
        hours: totalH,
        minutes: isNaN(parsedM) ? 0 : parsedM,
        startTime: s2.startTime || s2.timer_started_at || prev.startTime,
        active: s2.active !== undefined ? Boolean(s2.active) : (data?.settings?.receive_time_enabled !== undefined ? Boolean(data.settings.receive_time_enabled) : prev.active)
      }));

      // Detect if configured mainly in minutes
      if (totalH === 0 && parsedM > 0) {
        setS2Unit('minutes');
      }
    }
  }, [data?.settings, data?.shifts]);

  // Master Broadcast: syncs to Firebase Realtime DB
  const broadcastSync = async (s1: ShiftTimerData, s2: ShiftTimerData) => {
    const s1Result = computeDurationCountdown(0, s1.hours, s1.minutes, s1.startTime, s1.active);
    const s2Result = computeDurationCountdown(0, s2.hours, s2.minutes, s2.startTime, s2.active);

    const s1Countdown = s1Result.timeStr;
    const s2Countdown = s2Result.timeStr;

    const s1TimeLabel = s1.active ? formatDurationLabel(0, s1.hours, s1.minutes) : "";
    const s2TimeLabel = s2.active ? formatDurationLabel(0, s2.hours, s2.minutes) : "";

    const shift1Payload = {
      title: s1.title,
      days: 0,
      hours: s1.hours,
      minutes: s1.minutes,
      duration_days: 0,
      duration_hours: s1.hours,
      duration_minutes: s1.minutes,
      time: "",
      startTime: s1.startTime,
      timer_started_at: s1.startTime,
      active: s1.active,
      visible: true,
      display: true,
      show: true,
      status: s1.active ? (s1Result.isFinished ? 'completed' : 'active') : 'stopped',
      timer_status: s1.active ? (s1Result.isFinished ? 'completed' : 'running') : 'stopped',
      timer_running: s1.active && !s1Result.isFinished,
      is_finished: s1Result.isFinished,
      countdown: s1Countdown,
      timeRemaining: s1Countdown,
      timer_value: s1.active ? s1Countdown : "00:00:00",
      updatedAt: Date.now()
    };

    const shift2Payload = {
      title: s2.title,
      days: 0,
      hours: s2.hours,
      minutes: s2.minutes,
      duration_days: 0,
      duration_hours: s2.hours,
      duration_minutes: s2.minutes,
      time: "",
      startTime: s2.startTime,
      timer_started_at: s2.startTime,
      active: s2.active,
      visible: true,
      display: true,
      show: true,
      status: s2.active ? (s2Result.isFinished ? 'completed' : 'active') : 'stopped',
      timer_status: s2.active ? (s2Result.isFinished ? 'completed' : 'running') : 'stopped',
      timer_running: s2.active && !s2Result.isFinished,
      is_finished: s2Result.isFinished,
      countdown: s2Countdown,
      timeRemaining: s2Countdown,
      timer_value: s2.active ? s2Countdown : "00:00:00",
      updatedAt: Date.now()
    };

    const reviewShiftsObj = {
      shift_1: shift1Payload,
      shift_2: shift2Payload
    };

    const shiftsObj = {
      shift_1: shift1Payload,
      shift_2: shift2Payload,
      shift1: shift1Payload,
      shift2: shift2Payload
    };

    const settingsPatch = {
      review_shifts: reviewShiftsObj,
      shifts: shiftsObj,
      
      // Shift 1 / Report Time
      report_time_enabled: s1.active,
      report_time_hours: s1.hours,
      report_time_minutes: s1.minutes,
      report_time_countdown: s1Countdown,
      report_countdown: s1Countdown,
      is_report_timer_running: s1.active && !s1Result.isFinished,
      
      // Shift 2 / Receive Time
      receive_time_enabled: s2.active,
      receive_time_hours: s2.hours,
      receive_time_minutes: s2.minutes,
      receive_time_countdown: s2Countdown,
      receive_countdown: s2Countdown,
      is_receive_timer_running: s2.active && !s2Result.isFinished,
      
      timer_last_updated: Date.now()
    };

    const syncPromises = [
      update(ref(db, "settings"), settingsPatch),
      set(ref(db, "shifts"), shiftsObj),
      set(ref(db, "review_shifts"), reviewShiftsObj)
    ];

    const results = await Promise.allSettled(syncPromises);
    const hasSuccess = results.some(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

    if (!hasSuccess && errors.length > 0) {
      console.warn("Database sync notice:", errors[0]);
    }
  };

  const startTimer = async (
    shiftKey: 'shift1' | 'shift2', 
    targetValue?: number, 
    unit?: 'hours' | 'minutes'
  ) => {
    let s1 = { ...shift1 };
    let s2 = { ...shift2 };

    const currentUnit = unit || (shiftKey === 'shift1' ? s1Unit : s2Unit);

    if (shiftKey === 'shift1') {
      if (targetValue !== undefined) {
        if (currentUnit === 'minutes') {
          s1.hours = 0;
          s1.minutes = targetValue;
        } else {
          s1.hours = targetValue;
          s1.minutes = 0;
        }
      }
      s1.active = true;
      s1.startTime = Date.now();
      setShift1(s1);
    } else if (shiftKey === 'shift2') {
      if (targetValue !== undefined) {
        if (currentUnit === 'minutes') {
          s2.hours = 0;
          s2.minutes = targetValue;
        } else {
          s2.hours = targetValue;
          s2.minutes = 0;
        }
      }
      s2.active = true;
      s2.startTime = Date.now();
      setShift2(s2);
    }

    try {
      setIsUpdating(true);
      await broadcastSync(s1, s2);
      const target = shiftKey === 'shift1' ? s1 : s2;
      const durationText = target.hours > 0 
        ? `${target.hours} ঘন্টা ${target.minutes > 0 ? target.minutes + ' মিনিট' : ''}`
        : `${target.minutes} মিনিট`;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${target.title}: ${durationText} কাউন্টডাউন শুরু হয়েছে`,
        text: 'সময় শেষ হলে 00:00:00 এ থেমে থাকবে।',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (e: any) {
      console.warn("Timer start sync note:", e);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'টাইমার কাউন্টডাউন শুরু হয়েছে',
        text: 'লোকাল ও রিয়েলটাইম স্টেট আপডেট হয়েছে।',
        showConfirmButton: false,
        timer: 2000
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const stopTimer = async (shiftKey: 'shift1' | 'shift2') => {
    let s1 = { ...shift1 };
    let s2 = { ...shift2 };

    if (shiftKey === 'shift1') {
      s1.active = false;
      setShift1(s1);
    } else if (shiftKey === 'shift2') {
      s2.active = false;
      setShift2(s2);
    }

    try {
      setIsUpdating(true);
      await broadcastSync(s1, s2);
      const target = shiftKey === 'shift1' ? s1 : s2;
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `${target.title}: টাইমার বন্ধ (00:00:00)`,
        showConfirmButton: false,
        timer: 1800
      });
    } catch (e: any) {
      console.warn("Timer stop sync note:", e);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'টাইমার বন্ধ করা হয়েছে (00:00:00)',
        showConfirmButton: false,
        timer: 1800
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const s1Status = computeDurationCountdown(shift1.days, shift1.hours, shift1.minutes, shift1.startTime, shift1.active);
  const s2Status = computeDurationCountdown(shift2.days, shift2.hours, shift2.minutes, shift2.startTime, shift2.active);

  const hourButtons = [1, 2, 3, 5, 8, 12, 24, 48, 72, 120, 240, 500];
  const minuteButtons = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];

  // Reusable Single Shift Controller Card
  const renderShiftCard = (
    key: 'shift1' | 'shift2',
    shiftData: ShiftTimerData,
    setShiftData: React.Dispatch<React.SetStateAction<ShiftTimerData>>,
    unit: 'hours' | 'minutes',
    setUnit: (u: 'hours' | 'minutes') => void,
    status: ReturnType<typeof computeDurationCountdown>,
    icon: any,
    themeColor: {
      border: string;
      activeBg: string;
      badgeBg: string;
      badgeText: string;
      btnBg: string;
      btnHover: string;
      textAccent: string;
      ring: string;
    }
  ) => {
    const IconComponent = icon;

    // Display formatted tag e.g. "3 ঘন্টা" or "30 মিনিট" or "2h 30m"
    const displayTag = shiftData.hours > 0 && shiftData.minutes > 0
      ? `${shiftData.hours}h ${shiftData.minutes}m`
      : (shiftData.hours > 0 ? `${shiftData.hours} ঘন্টা` : `${shiftData.minutes} মিনিট`);

    return (
      <div 
        className={`bg-white rounded-2xl border-2 transition-all p-5 sm:p-6 shadow-sm ${
          shiftData.active 
            ? (status.isFinished ? 'border-amber-300 ring-4 ring-amber-500/10' : `${themeColor.border} ring-4 ${themeColor.ring}`)
            : 'border-slate-200 opacity-90'
        }`}
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${themeColor.badgeBg} ${themeColor.badgeText} shadow-sm`}>
              <IconComponent size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">
                  {shiftData.title}
                </h3>
                {shiftData.active ? (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${themeColor.badgeBg} ${themeColor.badgeText}`}>
                    {displayTag}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                    বন্ধ
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                {!shiftData.active ? '🔴 টাইমার বন্ধ (00:00:00)' : (status.isFinished ? '⏱️ সময় সমাপ্ত (00:00:00)' : '🟢 কাউন্টডাউন চলছে')}
              </div>
            </div>
          </div>

          {/* Clock Display */}
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-mono border border-slate-800 shadow-inner">
            <Timer size={16} className={shiftData.active && !status.isFinished ? `${themeColor.textAccent} animate-spin` : 'text-slate-500'} />
            <span className="text-xs text-slate-400 font-sans font-bold">কাউন্টডাউন:</span>
            <span className={`text-base font-black tracking-wider ${
              !shiftData.active ? 'text-rose-400' : (status.isFinished ? 'text-amber-400' : themeColor.textAccent)
            }`}>
              {status.timeStr}
            </span>
          </div>
        </div>

        {/* Hour / Minute Switcher & Selectors */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <label className="text-xs font-black text-slate-700">
                সময় নির্ধারণ করুন (Switch Hours / Minutes):
              </label>

              {/* Unit Switch Toggle: ঘন্টা vs মিনিট */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setUnit('hours');
                    // if currently 0 hours, set default 1 hour
                    if (shiftData.hours === 0 && shiftData.minutes > 0) {
                      const convertedHours = Math.max(1, Math.round(shiftData.minutes / 60));
                      setShiftData(prev => ({ ...prev, hours: convertedHours, minutes: 0 }));
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    unit === 'hours'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🕒 ঘন্টা (Hours)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnit('minutes');
                    // if currently hours > 0, set minutes = hours * 60 or default 30
                    if (shiftData.minutes === 0 && shiftData.hours > 0) {
                      const convertedMinutes = shiftData.hours * 60;
                      setShiftData(prev => ({ ...prev, hours: 0, minutes: Math.min(30000, convertedMinutes) }));
                    } else if (shiftData.minutes === 0) {
                      setShiftData(prev => ({ ...prev, minutes: 30, hours: 0 }));
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    unit === 'minutes'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⏱️ মিনিট (Minutes)
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Manual Input based on selected unit */}
              {unit === 'hours' ? (
                <div className="relative flex items-center w-36">
                  <input 
                    type="number"
                    min="1"
                    max="1000"
                    value={shiftData.hours || 1}
                    onChange={e => {
                      const h = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setShiftData(prev => ({ ...prev, hours: h, minutes: 0 }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none pr-12"
                    placeholder="ঘন্টা (1-500+)"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">ঘন্টা</span>
                </div>
              ) : (
                <div className="relative flex items-center w-36">
                  <input 
                    type="number"
                    min="1"
                    max="30000"
                    value={shiftData.minutes || 1}
                    onChange={e => {
                      const m = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setShiftData(prev => ({ ...prev, minutes: m, hours: 0 }));
                    }}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none pr-12"
                    placeholder="মিনিট"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">মিনিট</span>
                </div>
              )}

              {/* Quick Pills based on unit */}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {unit === 'hours' ? (
                  hourButtons.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setShiftData(prev => ({ ...prev, hours: h, minutes: 0 }));
                        startTimer(key, h, 'hours');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        shiftData.hours === h && shiftData.minutes === 0
                          ? `${themeColor.btnBg} text-white shadow-xs font-black`
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {h}h
                    </button>
                  ))
                ) : (
                  minuteButtons.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setShiftData(prev => ({ ...prev, minutes: m, hours: 0 }));
                        startTimer(key, m, 'minutes');
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        shiftData.minutes === m && shiftData.hours === 0
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startTimer(key)}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all active:scale-95 ${
                  unit === 'minutes' ? 'bg-emerald-600 hover:bg-emerald-700' : `${themeColor.btnBg} ${themeColor.btnHover}`
                }`}
              >
                <Play size={13} fill="currentColor" /> {
                  unit === 'minutes'
                    ? `${shiftData.minutes} মিনিট কাউন্টডাউন শুরু`
                    : `${shiftData.hours} ঘন্টা কাউন্টডাউন শুরু`
                }
              </button>

              <button
                type="button"
                onClick={() => startTimer(key)}
                disabled={isUpdating}
                title="নতুন করে রিসেট করুন"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all active:scale-95"
              >
                <RotateCcw size={13} /> রিসেট
              </button>
            </div>

            {shiftData.active ? (
              <button
                type="button"
                onClick={() => stopTimer(key)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-all active:scale-95"
              >
                <Square size={13} fill="currentColor" /> টাইমার বন্ধ করুন (00:00:00)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startTimer(key)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all active:scale-95"
              >
                <Play size={13} fill="currentColor" /> কাউন্টডাউন চালু করুন
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-800">
              কাউন্টডাউন টাইমার কন্ট্রোলার
            </h2>
            <p className="text-xs text-slate-500">
              ঘন্টা বা মিনিট সুইচ করে কাউন্টডাউন নির্ধারণ করুন • শেষ হলে <span className="font-mono font-bold text-slate-700">00:00:00</span> এ থামবে
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> সব শিফট
          </button>
          <button
            onClick={() => setActiveTab('shift1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'shift1' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} /> রিপোর্ট টাইম
          </button>
          <button
            onClick={() => setActiveTab('shift2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'shift2' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox size={14} /> রিসিভ টাইম
          </button>
        </div>
      </div>

      {/* Shifts Grid / List */}
      <div className="space-y-4">
        {/* Shift 1: রিপোর্ট টাইম (Report Time) */}
        {(activeTab === 'all' || activeTab === 'shift1') && renderShiftCard(
          'shift1',
          shift1,
          setShift1,
          s1Unit,
          setS1Unit,
          s1Status,
          FileText,
          {
            border: 'border-indigo-400',
            activeBg: 'bg-indigo-50',
            badgeBg: 'bg-indigo-100',
            badgeText: 'text-indigo-700',
            btnBg: 'bg-indigo-600',
            btnHover: 'hover:bg-indigo-700',
            textAccent: 'text-indigo-300',
            ring: 'ring-indigo-500/10'
          }
        )}

        {/* Shift 2: রিসিভ টাইম (Receive Time) */}
        {(activeTab === 'all' || activeTab === 'shift2') && renderShiftCard(
          'shift2',
          shift2,
          setShift2,
          s2Unit,
          setS2Unit,
          s2Status,
          Inbox,
          {
            border: 'border-emerald-400',
            activeBg: 'bg-emerald-50',
            badgeBg: 'bg-emerald-100',
            badgeText: 'text-emerald-700',
            btnBg: 'bg-emerald-600',
            btnHover: 'hover:bg-emerald-700',
            textAccent: 'text-emerald-300',
            ring: 'ring-emerald-500/10'
          }
        )}
      </div>
    </div>
  );
}
