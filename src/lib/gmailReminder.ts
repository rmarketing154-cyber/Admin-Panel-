import Swal from 'sweetalert2';
import { soundAlerts } from './sound';
import { db, getFirebaseFunctions } from './firebase';
import { ref, push } from 'firebase/database';
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
 * Triggers the 3-Hour Gmail Check Mobile Push Notification
 */
export function showAttractiveGmailReminder(isManualTest = false) {
  const title = '📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন';
  const body = '৩ ঘণ্টা অতিবাহিত হয়েছে! জরুরি মেইল, সিকিউরিটি আপডেট ও নতুন সাবমিশন দেখতে অ্যাপটি চেক করুন।';

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
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
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
