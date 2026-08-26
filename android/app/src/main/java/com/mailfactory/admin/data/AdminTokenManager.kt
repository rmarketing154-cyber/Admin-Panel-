package com.mailfactory.admin.data

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.messaging.FirebaseMessaging

class AdminTokenManager(private val context: Context) {

    private val prefs = context.getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
    private val database = FirebaseDatabase.getInstance().reference

    @SuppressLint("HardwareIds")
    fun getDeviceId(): String {
        return Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown_device"
    }

    fun saveTokenLocally(token: String) {
        prefs.edit().putString("fcm_token", token).apply()
    }

    fun getLocalToken(): String? {
        return prefs.getString("fcm_token", null)
    }

    fun registerToken(token: String, adminEmail: String? = null) {
        saveTokenLocally(token)
        val deviceId = getDeviceId()
        val currentAdminEmail = adminEmail ?: FirebaseAuth.getInstance().currentUser?.email ?: "rmarketing154@gmail.com"

        val tokenData = hashMapOf(
            "token" to token,
            "deviceId" to deviceId,
            "adminEmail" to currentAdminEmail,
            "platform" to "android",
            "lastUpdated" to System.currentTimeMillis(),
            "enabled" to isPushEnabled()
        )

        // Save under admin_tokens/{deviceId} to prevent duplicate devices
        database.child("admin_tokens").child(deviceId).setValue(tokenData)
            .addOnSuccessListener {
                Log.d("AdminTokenManager", "Admin FCM token registered successfully for device: $deviceId")
            }
            .addOnFailureListener { e ->
                Log.e("AdminTokenManager", "Failed to register Admin FCM token", e)
            }
    }

    fun unregisterToken(onComplete: (() -> Unit)? = null) {
        val deviceId = getDeviceId()
        database.child("admin_tokens").child(deviceId).removeValue()
            .addOnCompleteListener {
                FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener {
                    prefs.edit().remove("fcm_token").apply()
                    onComplete?.invoke()
                }
            }
    }

    fun isPushEnabled(): Boolean = prefs.getBoolean("pref_push_master", true)
    fun isGmailEnabled(): Boolean = prefs.getBoolean("pref_gmail", true)
    fun isWithdrawalEnabled(): Boolean = prefs.getBoolean("pref_withdrawal", true)
    fun isNewUserEnabled(): Boolean = prefs.getBoolean("pref_new_user", true)
    fun isReportEnabled(): Boolean = prefs.getBoolean("pref_report", true)

    fun isPeriodicReminderEnabled(): Boolean = prefs.getBoolean("pref_periodic_reminder_enabled", true)
    fun setPeriodicReminderEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("pref_periodic_reminder_enabled", enabled).apply()
        val deviceId = getDeviceId()
        database.child("admin_tokens").child(deviceId).child("periodicReminderEnabled").setValue(enabled)
    }

    fun getPeriodicReminderIntervalMinutes(): Long = prefs.getLong("pref_periodic_reminder_interval_min", 180L) // Default 3 hours = 180 minutes
    fun setPeriodicReminderIntervalMinutes(minutes: Long) {
        prefs.edit().putLong("pref_periodic_reminder_interval_min", minutes).apply()
        val deviceId = getDeviceId()
        database.child("admin_tokens").child(deviceId).child("periodicReminderIntervalMin").setValue(minutes)
    }

    fun getAdminUrl(): String {
        return prefs.getString("pref_admin_url", "https://ais-pre-ke5nti73kgbryjyxjqkkae-659427486150.asia-east1.run.app/") ?: "https://ais-pre-ke5nti73kgbryjyxjqkkae-659427486150.asia-east1.run.app/"
    }

    fun setAdminUrl(url: String) {
        var cleanUrl = url.trim()
        if (cleanUrl.isNotEmpty() && !cleanUrl.endsWith("/")) {
            cleanUrl += "/"
        }
        prefs.edit().putString("pref_admin_url", cleanUrl).apply()
    }

    fun setPushEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("pref_push_master", enabled).apply()
        val deviceId = getDeviceId()
        database.child("admin_tokens").child(deviceId).child("enabled").setValue(enabled)
    }

    fun setCategoryEnabled(key: String, enabled: Boolean) {
        prefs.edit().putBoolean(key, enabled).apply()
        val deviceId = getDeviceId()
        database.child("admin_tokens").child(deviceId).child(key).setValue(enabled)
    }

    fun shouldShowNotification(type: String?): Boolean {
        if (!isPushEnabled()) return false
        return when (type?.lowercase()) {
            "gmail" -> isGmailEnabled()
            "withdrawal", "withdraw" -> isWithdrawalEnabled()
            "new_user", "user" -> isNewUserEnabled()
            "report", "support" -> isReportEnabled()
            else -> true
        }
    }
}
