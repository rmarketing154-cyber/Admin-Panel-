package com.mailfactory.admin.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.mailfactory.admin.MainActivity
import com.mailfactory.admin.R

object NotificationHelper {

    const val CHANNEL_GMAIL = "channel_gmail"
    const val CHANNEL_WITHDRAWAL = "channel_withdrawal"
    const val CHANNEL_USER = "channel_user"
    const val CHANNEL_REPORT = "channel_report"
    const val CHANNEL_GENERAL = "channel_general"

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val channels = listOf(
                NotificationChannel(
                    CHANNEL_GMAIL,
                    context.getString(R.string.channel_gmail_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.channel_gmail_desc)
                    enableLights(true)
                    lightColor = Color.BLUE
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_WITHDRAWAL,
                    context.getString(R.string.channel_withdrawal_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.channel_withdrawal_desc)
                    enableLights(true)
                    lightColor = Color.GREEN
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_USER,
                    context.getString(R.string.channel_user_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.channel_user_desc)
                    enableLights(true)
                    lightColor = Color.CYAN
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_REPORT,
                    context.getString(R.string.channel_report_name),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = context.getString(R.string.channel_report_desc)
                    enableLights(true)
                    lightColor = Color.RED
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    CHANNEL_GENERAL,
                    context.getString(R.string.channel_general_name),
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = context.getString(R.string.channel_general_desc)
                }
            )

            notificationManager.createNotificationChannels(channels)
        }
    }

    fun getChannelForType(type: String?): String {
        return when (type?.lowercase()) {
            "gmail" -> CHANNEL_GMAIL
            "withdrawal", "withdraw" -> CHANNEL_WITHDRAWAL
            "new_user", "user", "registration" -> CHANNEL_USER
            "report", "dispute", "support" -> CHANNEL_REPORT
            else -> CHANNEL_GENERAL
        }
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        type: String? = null,
        target: String? = null,
        id: String? = null
    ) {
        val channelId = getChannelForType(type)
        val notificationId = (System.currentTimeMillis() % 100000).toInt()

        // Construct Deep Link PendingIntent
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("EXTRA_TARGET_PAGE", target ?: getTargetFromType(type))
            putExtra("EXTRA_ITEM_ID", id)
            putExtra("EXTRA_NOTIFICATION_TYPE", type)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSubText("Mail factory admin")
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(pendingIntent)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, notificationBuilder.build())
    }

    fun getTargetFromType(type: String?): String {
        return when (type?.lowercase()) {
            "gmail" -> "submissions"
            "withdrawal", "withdraw" -> "withdrawals"
            "new_user", "user" -> "users"
            "report", "support" -> "chat"
            else -> "dashboard"
        }
    }
}
