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

        updateCategorySwitchesState(binding.switchMaster.isChecked)
    }

    private fun updateCategorySwitchesState(masterEnabled: Boolean) {
        binding.switchGmail.isEnabled = masterEnabled
        binding.switchWithdrawal.isEnabled = masterEnabled
        binding.switchNewUser.isEnabled = masterEnabled
        binding.switchReport.isEnabled = masterEnabled
    }

    private fun setupListeners() {
        binding.switchMaster.setOnCheckedChangeListener { _, isChecked ->
            tokenManager.setPushEnabled(isChecked)
            updateCategorySwitchesState(isChecked)
            Toast.makeText(this, if (isChecked) "Push Notifications Enabled" else "Push Notifications Disabled", Toast.LENGTH_SHORT).show()
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
