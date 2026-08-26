package com.mailfactory.admin.services

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import com.mailfactory.admin.data.AdminTokenManager
import com.mailfactory.admin.utils.NotificationHelper

/**
 * Offline-Capable Broadcast Receiver for Configurable Gmail Check Push Reminder.
 * Uses native Android AlarmManager which works 100% offline without any internet connection.
 */
class GmailReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        Log.d(TAG, "Configurable Gmail Check Alarm Triggered (Works 100% Offline)")

        val tokenManager = AdminTokenManager(context)
        if (!tokenManager.isPeriodicReminderEnabled() || !tokenManager.isPushEnabled()) {
            Log.d(TAG, "Periodic reminder is disabled in preferences. Skipping notification.")
            return
        }

        val intervalMin = tokenManager.getPeriodicReminderIntervalMinutes()
        val intervalText = when {
            intervalMin < 60 -> "$intervalMin মিনিট"
            intervalMin % 60 == 0L -> "${intervalMin / 60} ঘণ্টা"
            else -> "${intervalMin / 60} ঘণ্টা ${intervalMin % 60} মিনিট"
        }

        // 1. Show Native Notification on Status Bar
        NotificationHelper.showNotification(
            context = context,
            title = "📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন",
            body = "$intervalText অতিবাহিত হয়েছে! নতুন জরুরি মেইল ও সাবমিশন দেখতে অ্যাপটি চেক করুন।",
            type = "gmail",
            target = "submissions",
            id = "gmail_reminder_${System.currentTimeMillis()}"
        )

        // 2. Reschedule next alarm with the configured interval
        scheduleNextReminder(context)
    }

    companion object {
        private const val TAG = "GmailReminderReceiver"
        private const val REQUEST_CODE = 9001

        fun scheduleNextReminder(context: Context) {
            val tokenManager = AdminTokenManager(context)
            if (!tokenManager.isPeriodicReminderEnabled() || !tokenManager.isPushEnabled()) {
                cancelReminder(context)
                return
            }

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, GmailReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val intervalMinutes = tokenManager.getPeriodicReminderIntervalMinutes().coerceAtLeast(1L)
            val intervalMs = intervalMinutes * 60 * 1000L
            val triggerAtMillis = SystemClock.elapsedRealtime() + intervalMs

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
                Log.d(TAG, "Periodic Alarm scheduled for $intervalMinutes minutes ($intervalMs ms) later")
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException while scheduling exact alarm: ${e.message}")
                alarmManager.set(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            }
        }

        fun cancelReminder(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, GmailReminderReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.cancel(pendingIntent)
                Log.d(TAG, "Periodic Gmail Check Alarm cancelled")
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling alarm: ${e.message}")
            }
        }

        fun triggerImmediateTest(context: Context) {
            val tokenManager = AdminTokenManager(context)
            val intervalMin = tokenManager.getPeriodicReminderIntervalMinutes()
            val intervalText = when {
                intervalMin < 60 -> "$intervalMin মিনিট"
                intervalMin % 60 == 0L -> "${intervalMin / 60} ঘণ্টা"
                else -> "${intervalMin / 60} ঘণ্টা ${intervalMin % 60} মিনিট"
            }

            NotificationHelper.showNotification(
                context = context,
                title = "📧 ডিয়ার এডমিন! জিমেইল চেকিং করুন (টেস্ট)",
                body = "আপনার নির্ধারিত প্রতি $intervalText পর পর রিমাইন্ডার পুশ সফলভাবে সক্রিয় আছে!",
                type = "gmail",
                target = "submissions",
                id = "gmail_reminder_test_${System.currentTimeMillis()}"
            )
        }
    }
}
