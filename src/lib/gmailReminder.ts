import Swal from 'sweetalert2';
import { soundAlerts } from './sound';
import { getFirebaseFunctions } from './firebase';
import { httpsCallable } from 'firebase/functions';

const REMINDER_KEY = 'last_gmail_reminder_time';
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export function getLastReminderTime(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(REMINDER_KEY);
  return saved ? Number(saved) : 0;
}

export function setLastReminderTime(time: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDER_KEY, String(time));
}

export function getTimeUntilNextReminder(): number {
  const last = getLastReminderTime();
  if (!last) return 0;
  const next = last + THREE_HOURS_MS;
  const remaining = next - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'এখনই সময় হয়েছে';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} ঘণ্টা ${minutes} মিনিট পর`;
  }
  return `${minutes} মিনিট পর`;
}

/**
 * Focuses and brings this app to the foreground / navigates directly to New Submissions
 */
export function openThisAppDirectly(): void {
  if (typeof window === 'undefined') return;

  try {
    window.focus();
    // Switch directly to 'submissions' (New Submissions) tab
    if ((window as any).onNotificationDeepLink) {
      (window as any).onNotificationDeepLink('submissions');
    }
  } catch (err) {
    console.warn('App focus notice:', err);
  }
}

/**
 * Sends a real FCM mobile push notification to all registered Admin devices
 */
export async function sendMobilePushToAdmins(title: string, body: string) {
  try {
    const fns = getFirebaseFunctions();
    const sendPushFn = httpsCallable(fns, 'sendManualAdminPush');
    await sendPushFn({
      title: title,
      body: body,
      type: 'gmail',
      target: 'submissions',
      id: 'gmail_reminder_' + Date.now()
    });
    console.log('Mobile FCM push notification dispatched to admin phones.');
  } catch (err) {
    console.warn('FCM push dispatch notice (normal if Cloud Function is offline or offline auth):', err);
  }
}

/**
 * Triggers the eye-catching 3-Hour Gmail Check Notification
 */
export function showAttractiveGmailReminder(isManualTest = false) {
  const title = '📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন';
  const body = '৩ ঘণ্টা অতিবাহিত হয়েছে! জরুরি মেইল, সিকিউরিটি আপডেট ও রিকোয়েস্ট দেখতে অ্যাপটি চেক করুন।';

  // 1. Dispatch Mobile FCM Push Notification to Android phones
  sendMobilePushToAdmins(title, body);

  // 2. Play synthesized alert chime
  try {
    soundAlerts.playPushNotificationAlert();
  } catch (e) {
    console.warn('Sound error:', e);
  }

  // 3. Request / Send native Web Notification if allowed
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: 'https://files.catbox.moe/cqiv5k.png',
          badge: 'https://files.catbox.moe/cqiv5k.png',
          tag: 'gmail-check-reminder',
          requireInteraction: true
        });
        notif.onclick = () => {
          openThisAppDirectly();
          window.focus();
        };
      } catch (err) {
        console.warn('Browser notification error:', err);
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // 3. Update localStorage timestamp
  setLastReminderTime(Date.now());

  // 4. Show highly attractive, custom-styled SweetAlert popup
  Swal.fire({
    title: `<div class="flex items-center justify-center gap-2 text-rose-600 font-extrabold text-xl sm:text-2xl tracking-tight">
      <span class="animate-bounce inline-block">📬</span> ডিয়ার এডমিন! জিমেইল চেকিং করুন
    </div>`,
    html: `
      <div class="text-left space-y-3 py-2 text-slate-700">
        <div class="p-3.5 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 rounded-xl border border-rose-100/80 shadow-inner">
          <div class="flex items-start gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-md shadow-rose-500/20">
              ✉️
            </div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                ৩ ঘণ্টা অতিবাহিত হয়েছে! নতুন গুরুত্বপূর্ণ ইমেইল চেক করার সময় হয়েছে।
              </p>
              <p class="text-[11px] sm:text-xs text-slate-600 mt-1">
                আপনার সিস্টেমের সিকিউরিটি নোটিশ, অ্যাকাউন্ট আপডেট বা নতুন রিকোয়েস্ট মিস করবেন না।
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div class="bg-slate-100/80 p-2.5 rounded-lg border border-slate-200">
            <span class="font-bold text-slate-800 block text-xs mb-0.5">⏰ চেকিং শিডিউল</span>
            প্রতি ৩ ঘণ্টা পর পর স্বয়ংক্রিয় রিমাইন্ডার
          </div>
          <div class="bg-slate-100/80 p-2.5 rounded-lg border border-slate-200">
            <span class="font-bold text-slate-800 block text-xs mb-0.5">💾 লোকাল স্টোরেজ</span>
            নিরাপদে ব্যাকগ্রাউন্ডে সক্রিয়
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: '📥 New Submissions দেখুন',
    denyButtonText: '⏰ ১ ঘণ্টা পর মনে করান',
    cancelButtonText: '✅ পরে দেখব',
    confirmButtonColor: '#e11d48',
    denyButtonColor: '#4f46e5',
    cancelButtonColor: '#64748b',
    customClass: {
      popup: 'rounded-3xl border border-rose-200 shadow-2xl p-6 bg-white',
      confirmButton: 'font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md',
      denyButton: 'font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md',
      cancelButton: 'font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md'
    },
    backdrop: `
      rgba(15, 23, 42, 0.6)
      left top
      no-repeat
    `,
    timer: isManualTest ? undefined : 30000,
    timerProgressBar: true
  }).then((result) => {
    if (result.isConfirmed) {
      openThisAppDirectly();
    } else if (result.isDenied) {
      // Snooze for 1 hour by advancing the last reminder timestamp to (now - 2 hours)
      const oneHourSnooze = Date.now() - (2 * 60 * 60 * 1000);
      setLastReminderTime(oneHourSnooze);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: '১ ঘণ্টা পর আবার মনে করিয়ে দেওয়া হবে',
        showConfirmButton: false,
        timer: 3000
      });
    }
  });
}

/**
 * Initializes the background checker for 3-hour Gmail checking
 */
export function initGmailReminderService(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Request notification permission if not yet decided
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  // Check on boot
  const lastTime = getLastReminderTime();
  if (!lastTime) {
    // First time boot - initialize to now so it doesn't instantly annoy, or trigger after 3 hours
    setLastReminderTime(Date.now());
  } else {
    const elapsed = Date.now() - lastTime;
    if (elapsed >= THREE_HOURS_MS) {
      // Delay slightly so login/app mount completes smoothly
      setTimeout(() => {
        showAttractiveGmailReminder(false);
      }, 2000);
    }
  }

  // Periodic interval checking every 60 seconds
  const intervalId = setInterval(() => {
    const last = getLastReminderTime();
    const elapsed = Date.now() - last;
    if (elapsed >= THREE_HOURS_MS) {
      showAttractiveGmailReminder(false);
    }
  }, 60000);

  // Attach global trigger for debug/testing
  (window as any).triggerGmailReminder = () => showAttractiveGmailReminder(true);

  return () => {
    clearInterval(intervalId);
  };
}
