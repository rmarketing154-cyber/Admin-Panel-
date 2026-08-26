import Swal from 'sweetalert2';
import { soundAlerts } from './sound';
import { db, getFirebaseFunctions } from './firebase';
import { ref, push } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';

const REMINDER_KEY = 'last_gmail_reminder_time';
const REMINDER_INTERVAL_KEY = 'gmail_reminder_interval_min';
const REMINDER_ENABLED_KEY = 'gmail_reminder_enabled';
const DEFAULT_INTERVAL_MIN = 180; // 3 hours = 180 min

export function isReminderEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(REMINDER_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setReminderEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
}

export function getReminderIntervalMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_INTERVAL_MIN;
  const saved = localStorage.getItem(REMINDER_INTERVAL_KEY);
  return saved ? Number(saved) : DEFAULT_INTERVAL_MIN;
}

export function setReminderIntervalMinutes(minutes: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDER_INTERVAL_KEY, String(minutes));
}

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
  const intervalMs = getReminderIntervalMinutes() * 60 * 1000;
  const next = last + intervalMs;
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
 * Sends a real FCM & Realtime mobile push notification to all registered Android devices
 */
export async function sendMobilePushToAdmins(title: string, body: string) {
  try {
    // 1. Write to Firebase Realtime Database 'admin_notifications'
    // This directly triggers Android's background RealtimeAlertService to post a native status bar notification!
    await push(ref(db, 'admin_notifications'), {
      title: title,
      message: body,
      body: body,
      type: 'gmail',
      target: 'submissions',
      timestamp: Date.now(),
      sendPush: true
    });
  } catch (err) {
    console.warn('RTDB notification dispatch note:', err);
  }

  try {
    // 2. Call Cloud Function FCM Dispatcher to reach FCM Tokens
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
    console.warn('FCM callable note:', err);
  }
}

/**
 * Triggers the Configurable Gmail Check Mobile Push Notification
 */
export function showAttractiveGmailReminder(isManualTest = false) {
  if (!isManualTest && !isReminderEnabled()) {
    return;
  }

  const intervalMin = getReminderIntervalMinutes();
  const intervalText = intervalMin < 60 ? `${intervalMin} মিনিট` : `${intervalMin / 60} ঘণ্টা`;

  const title = '📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন';
  const body = isManualTest
    ? `আপনার নির্ধারিত প্রতি ${intervalText} পর পর রিমাইন্ডার পুশ সক্রিয় আছে!`
    : `${intervalText} অতিবাহিত হয়েছে! জরুরি মেইল, সিকিউরিটি আপডেট ও নতুন সাবমিশন দেখতে অ্যাপটি চেক করুন।`;

  // 1. Dispatch real Android system push notification (RealtimeAlertService + FCM)
  sendMobilePushToAdmins(title, body);

  // 2. Play synthesized alert chime
  try {
    soundAlerts.playPushNotificationAlert();
  } catch (e) {
    console.warn('Sound error:', e);
  }

  // 3. Request / Send native Web Notification in notification shade if permitted
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
    }
  }

  // 4. Update localStorage timestamp
  setLastReminderTime(Date.now());

  // 5. If manual test, show brief non-intrusive confirmation toast
  if (isManualTest) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'মোবাইলের নোটিফিকেশন বারে পুশ পাঠানো হয়েছে!',
      showConfirmButton: false,
      timer: 3000
    });
  }
}

/**
 * Initializes the background checker for Gmail checking
 */
export function initGmailReminderService(): () => void {
  if (typeof window === 'undefined') return () => {};

  const checkAndTrigger = () => {
    if (!isReminderEnabled()) return;
    const lastTime = getLastReminderTime();
    const intervalMs = getReminderIntervalMinutes() * 60 * 1000;
    if (!lastTime) {
      setLastReminderTime(Date.now());
    } else {
      const elapsed = Date.now() - lastTime;
      if (elapsed >= intervalMs) {
        showAttractiveGmailReminder(false);
      }
    }
  };

  // Check on boot after smooth mount
  setTimeout(checkAndTrigger, 3000);

  // Periodic interval checking every 30 seconds
  const intervalId = setInterval(checkAndTrigger, 30000);

  // Attach global trigger for debug/testing
  (window as any).triggerGmailReminder = () => showAttractiveGmailReminder(true);

  return () => {
    clearInterval(intervalId);
  };
}
