package com.mailfactory.admin.services

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.mailfactory.admin.data.AdminTokenManager
import com.mailfactory.admin.utils.NotificationHelper

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Token received: $token")
        val tokenManager = AdminTokenManager(applicationContext)
        tokenManager.registerToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "From: ${remoteMessage.from}")

        val tokenManager = AdminTokenManager(applicationContext)

        // Parse Data payload
        val data = remoteMessage.data
        val type = data["type"] ?: "general"
        
        // Handle click_action or clickAction payload explicitly
        val clickActionValue = data["click_action"] 
            ?: data["clickAction"] 
            ?: remoteMessage.notification?.clickAction

        var target = data["target"]
        if (target.isNullOrBlank() && !clickActionValue.isNullOrBlank()) {
            if (!clickActionValue.contains("NOTIFICATION_CLICK", ignoreCase = true)) {
                target = clickActionValue
            }
        }
        if (target.isNullOrBlank()) {
            target = NotificationHelper.getTargetFromType(type)
        }

        val id = data["id"] ?: data["submissionId"]

        // Check if admin enabled notifications for this category
        if (!tokenManager.shouldShowNotification(type)) {
            Log.d(TAG, "Notification skipped according to Admin preferences for type: $type")
            return
        }

        // Determine title and body (data payload takes priority, then notification payload, then defaults)
        var title = data["title"] ?: remoteMessage.notification?.title
        var body = data["body"] ?: remoteMessage.notification?.body

        if (title.isNullOrBlank()) {
            title = when (type.lowercase()) {
                "gmail" -> "📧 নতুন Gmail এসেছে"
                "withdrawal", "withdraw" -> "💰 নতুন উত্তোলন রিকোয়েস্ট"
                "new_user", "user" -> "👤 নতুন সদস্য রেজিস্ট্রেশন"
                "support", "chat", "message" -> "💬 সাপোর্টে নতুন মেসেজ"
                "report" -> "⚠️ নতুন রিপোর্ট"
                else -> "🔔 Mail factory admin Alert"
            }
        }

        if (body.isNullOrBlank()) {
            body = when (type.lowercase()) {
                "gmail" -> "নতুন Gmail এসেছে। Admin Panel থেকে ইনবক্স চেক করুন।"
                "withdrawal", "withdraw" -> "একজন ইউজার নতুন উত্তোলন রিকোয়েস্ট করেছে। বিস্তারিত দেখতে Admin Panel খুলুন।"
                "new_user", "user" -> "নতুন একজন সদস্য রেজিস্ট্রেশন করেছে।"
                "support", "chat", "message" -> "সাপোর্টে একজন ইউজার নতুন মেসেজ পাঠিয়েছে। রিপ্লাই দিতে Admin Panel খুলুন।"
                "report" -> "একজন ইউজার নতুন রিপোর্ট জমা দিয়েছে।"
                else -> "নতুন একটি নোটিফিকেশন এসেছে।"
            }
        }

        // Always display notification with high priority and target deep link
        NotificationHelper.showNotification(
            context = applicationContext,
            title = title,
            body = body,
            type = type,
            target = target,
            id = id
        )
    }

    companion object {
        private const val TAG = "MyFirebaseMessaging"
    }
}
