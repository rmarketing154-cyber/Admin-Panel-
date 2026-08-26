package com.mailfactory.admin.services

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import com.mailfactory.admin.utils.NotificationHelper

/**
 * Offline-Capable Broadcast Receiver for 3-Hour Gmail Check Reminder.
 * Uses native Android AlarmManager which works 100% offline without any internet connection.
 */
class GmailReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        Log.d(TAG, "3-Hour Gmail Check Alarm Triggered (Works 100% Offline)")

        // 1. Show Native Notification on Status Bar
        NotificationHelper.showNotification(
            context = context,
            title = "📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন",
            body = "৩ ঘণ্টা অতিবাহিত হয়েছে! নতুন গুরুত্বপূর্ণ মেইল ও সাবমিশন দেখতে অ্যাপটি চেক করুন।",
            type = "gmail",
            target = "submissions",
            id = "gmail_reminder_${System.currentTimeMillis()}"
        )

        // 2. Reschedule next 3-hour alarm to ensure accurate repeating even across deep Doze mode
        scheduleNextReminder(context)
    }

    companion object {
        private const val TAG = "GmailReminderReceiver"
        private const val INTERVAL_3_HOURS = 3 * 60 * 60 * 1000L // 3 Hours in MS
        private const val REQUEST_CODE = 9001

        fun scheduleNextReminder(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, GmailReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerAtMillis = SystemClock.elapsedRealtime() + INTERVAL_3_HOURS

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        pendingIntent
                    )
                }
                Log.d(TAG, "Offline 3-Hour Alarm scheduled for $INTERVAL_3_HOURS ms later")
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException while scheduling exact alarm: ${e.message}")
                alarmManager.set(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            }
        }
    }
}
