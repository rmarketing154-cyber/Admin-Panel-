package com.mailfactory.admin.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.messaging.FirebaseMessaging
import com.mailfactory.admin.data.AdminTokenManager
import com.mailfactory.admin.databinding.ActivitySettingsBinding
import com.mailfactory.admin.utils.NotificationHelper

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var tokenManager: AdminTokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        tokenManager = AdminTokenManager(this)

        setupToolbar()
        loadPreferences()
        setupListeners()
        fetchAndDisplayToken()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun loadPreferences() {
        binding.switchMaster.isChecked = tokenManager.isPushEnabled()
        binding.switchGmail.isChecked = tokenManager.isGmailEnabled()
        binding.switchWithdrawal.isChecked = tokenManager.isWithdrawalEnabled()
        binding.switchNewUser.isChecked = tokenManager.isNewUserEnabled()
        binding.switchReport.isChecked = tokenManager.isReportEnabled()
        binding.etAdminUrl.setText(tokenManager.getAdminUrl())

        // Load Periodic Reminder State
        binding.switchPeriodicReminder.isChecked = tokenManager.isPeriodicReminderEnabled()
        loadSelectedIntervalChip(tokenManager.getPeriodicReminderIntervalMinutes())

        updateCategorySwitchesState(binding.switchMaster.isChecked)
    }

    private fun loadSelectedIntervalChip(intervalMin: Long) {
        when (intervalMin) {
            30L -> binding.chipInterval30m.isChecked = true
            60L -> binding.chipInterval1h.isChecked = true
            120L -> binding.chipInterval2h.isChecked = true
            180L -> binding.chipInterval3h.isChecked = true
            240L -> binding.chipInterval4h.isChecked = true
            360L -> binding.chipInterval6h.isChecked = true
            720L -> binding.chipInterval12h.isChecked = true
            1440L -> binding.chipInterval24h.isChecked = true
            else -> binding.chipInterval3h.isChecked = true
        }
        updateIntervalStatusText(intervalMin)
    }

    private fun updateIntervalStatusText(intervalMin: Long) {
        val intervalText = when {
            intervalMin < 60 -> "$intervalMin মিনিট"
            intervalMin % 60 == 0L -> "${intervalMin / 60} ঘণ্টা"
            else -> "${intervalMin / 60} ঘণ্টা ${intervalMin % 60} মিনিট"
        }
        if (tokenManager.isPeriodicReminderEnabled()) {
            binding.tvCurrentIntervalStatus.text = "বর্তমান ব্যবধান: প্রতি $intervalText পর পর পুশ নোটিফিকেশন আসবে"
            binding.tvCurrentIntervalStatus.setTextColor(android.graphics.Color.parseColor("#38BDF8"))
        } else {
            binding.tvCurrentIntervalStatus.text = "জিমেইল চেকিং রিমাইন্ডার বন্ধ আছে"
            binding.tvCurrentIntervalStatus.setTextColor(android.graphics.Color.parseColor("#94A3B8"))
        }
    }

    private fun updateCategorySwitchesState(masterEnabled: Boolean) {
        binding.switchGmail.isEnabled = masterEnabled
        binding.switchWithdrawal.isEnabled = masterEnabled
        binding.switchNewUser.isEnabled = masterEnabled
        binding.switchReport.isEnabled = masterEnabled
        binding.switchPeriodicReminder.isEnabled = masterEnabled
        binding.chipGroupInterval.isEnabled = masterEnabled
    }

    private fun setupListeners() {
        binding.switchMaster.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setPushEnabled(isChecked)
            updateCategorySwitchesState(isChecked)
            if (isChecked && tokenManager.isPeriodicReminderEnabled()) {
                com.mailfactory.admin.services.GmailReminderReceiver.scheduleNextReminder(this)
            } else {
                com.mailfactory.admin.services.GmailReminderReceiver.cancelReminder(this)
            }
            Toast.makeText(this, if (isChecked) "Push Notifications Enabled" else "Push Notifications Disabled", Toast.LENGTH_SHORT).show()
        }

        binding.switchPeriodicReminder.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setPeriodicReminderEnabled(isChecked)
            updateIntervalStatusText(tokenManager.getPeriodicReminderIntervalMinutes())
            if (isChecked) {
                com.mailfactory.admin.services.GmailReminderReceiver.scheduleNextReminder(this)
                Toast.makeText(this, "জিমেইল চেকিং রিমাইন্ডার সক্রিয় করা হয়েছে", Toast.LENGTH_SHORT).show()
            } else {
                com.mailfactory.admin.services.GmailReminderReceiver.cancelReminder(this)
                Toast.makeText(this, "জিমেইল চেকিং রিমাইন্ডার বন্ধ করা হয়েছে", Toast.LENGTH_SHORT).show()
            }
        }

        binding.chipGroupInterval.setOnCheckedStateChangeListener { _, checkedIds ->
            if (checkedIds.isEmpty()) return@setOnCheckedStateChangeListener
            val selectedId = checkedIds.first()
            val newMinutes = when (selectedId) {
                binding.chipInterval30m.id -> 30L
                binding.chipInterval1h.id -> 60L
                binding.chipInterval2h.id -> 120L
                binding.chipInterval3h.id -> 180L
                binding.chipInterval4h.id -> 240L
                binding.chipInterval6h.id -> 360L
                binding.chipInterval12h.id -> 720L
                binding.chipInterval24h.id -> 1440L
                else -> 180L
            }

            tokenManager.setPeriodicReminderIntervalMinutes(newMinutes)
            updateIntervalStatusText(newMinutes)
            com.mailfactory.admin.services.GmailReminderReceiver.scheduleNextReminder(this)

            val displayLabel = when {
                newMinutes < 60 -> "$newMinutes মিনিট"
                else -> "${newMinutes / 60} ঘণ্টা"
            }
            Toast.makeText(this, "রিমাইন্ডার সময় প্রতি $displayLabel পর পর সেট করা হয়েছে", Toast.LENGTH_SHORT).show()
        }

        binding.btnTestPeriodicReminder.setOnClickListener {
            com.mailfactory.admin.services.GmailReminderReceiver.triggerImmediateTest(this)
            Toast.makeText(this, "টেস্ট জিমেইল রিমাইন্ডার পাঠানো হয়েছে!", Toast.LENGTH_SHORT).show()
        }

        binding.switchGmail.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setCategoryEnabled("pref_gmail", isChecked)
        }

        binding.switchWithdrawal.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setCategoryEnabled("pref_withdrawal", isChecked)
        }

        binding.switchNewUser.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setCategoryEnabled("pref_new_user", isChecked)
        }

        binding.switchReport.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setCategoryEnabled("pref_report", isChecked)
        }

        binding.btnSaveUrl.setOnClickListener {
            val url = binding.etAdminUrl.text?.toString() ?: ""
            if (url.trim().isEmpty()) {
                Toast.makeText(this, "URL cannot be empty", Toast.LENGTH_SHORT).show()
            } else {
                tokenManager.setAdminUrl(url)
                Toast.makeText(this, "URL Saved successfully!", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnSendTest.setOnClickListener {
            NotificationHelper.showNotification(
                context = this,
                title = "🧪 টেস্ট নোটিফিকেশন",
                body = "Mail Factory Pro Admin নোটিফিকেশন সিস্টেম সফলভাবে কাজ করছে!",
                type = "gmail",
                target = "dashboard",
                id = "test_123"
            )
            Toast.makeText(this, "Test Notification Dispatched", Toast.LENGTH_SHORT).show()
        }

        binding.tvDeviceToken.setOnClickListener {
            val token = tokenManager.getLocalToken()
            if (!token.isNullOrEmpty()) {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("FCM Token", token)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "FCM Token Copied to Clipboard", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun fetchAndDisplayToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful && task.result != null) {
                val token = task.result
                tokenManager.registerToken(token)
                binding.tvDeviceToken.text = "FCM Token: $token\n(Tap to copy)"
            } else {
                binding.tvDeviceToken.text = "FCM Token: Failed to retrieve"
            }
        }
    }
}
