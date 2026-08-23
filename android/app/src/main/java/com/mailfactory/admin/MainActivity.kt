package com.mailfactory.admin

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.mailfactory.admin.data.AdminTokenManager
import com.mailfactory.admin.databinding.ActivityMainBinding
import com.mailfactory.admin.ui.SettingsActivity

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var tokenManager: AdminTokenManager

    // Admin Console URL (Can point to local container or production hosting)
    private val defaultAdminUrl = "https://ais-pre-ke5nti73kgbryjyxjqkkae-659427486150.asia-east1.run.app/"

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d(TAG, "POST_NOTIFICATIONS permission granted")
            initFcm()
        } else {
            Log.w(TAG, "POST_NOTIFICATIONS permission denied by user")
            Toast.makeText(this, "Notification permission is needed for real-time alerts", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        tokenManager = AdminTokenManager(this)

        setSupportActionBar(binding.toolbar)

        // Request Notification Permission immediately upon launch
        checkNotificationPermission()

        // Hide UI until authenticated
        binding.root.visibility = View.INVISIBLE
        showBiometricPrompt()
    }

    private fun showBiometricPrompt() {
        val biometricManager = androidx.biometric.BiometricManager.from(this)
        val authenticators = androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG or androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL

        when (biometricManager.canAuthenticate(authenticators)) {
            androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS -> {
                Log.d(TAG, "App can authenticate using biometrics.")
            }
            androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            androidx.biometric.BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE,
            androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                // If biometric/PIN is not set up on device, proceed normally to not lock user out,
                // or you could force them to set a PIN. We proceed for safety.
                proceedAfterAuth()
                return
            }
            else -> {
                proceedAfterAuth()
                return
            }
        }

        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = androidx.biometric.BiometricPrompt(this, executor,
            object : androidx.biometric.BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    Toast.makeText(applicationContext, "Authentication required: $errString", Toast.LENGTH_SHORT).show()
                    finish() // Close app if user cancels or fails too many times
                }

                override fun onAuthenticationSucceeded(result: androidx.biometric.BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    proceedAfterAuth()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Toast.makeText(applicationContext, "Authentication failed", Toast.LENGTH_SHORT).show()
                }
            })

        val promptInfo = androidx.biometric.BiometricPrompt.PromptInfo.Builder()
            .setTitle("Admin Authentication")
            .setSubtitle("Unlock MailFactory Admin Panel")
            .setAllowedAuthenticators(authenticators)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    private fun proceedAfterAuth() {
        binding.root.visibility = View.VISIBLE
        checkNotificationPermission()
        try {
            com.mailfactory.admin.services.RealtimeAlertService.start(this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start RealtimeAlertService: ${e.message}")
        }
        setupWebView()
        setupSwipeRefresh()
        handleNotificationIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent?.let { handleNotificationIntent(it) }
    }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    initFcm()
                }
                shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> {
                    Toast.makeText(this, "Please allow notifications to receive live admin alerts.", Toast.LENGTH_LONG).show()
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
                else -> {
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } else {
            initFcm()
        }
    }

    private fun initFcm() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful && task.result != null) {
                val token = task.result
                Log.d(TAG, "FCM Token: $token")
                tokenManager.registerToken(token)
            } else {
                Log.e(TAG, "Fetching FCM registration token failed", task.exception)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            settings.userAgentString = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

            addJavascriptInterface(AdminJsBridge(), "AndroidBridge")

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    binding.progressBar.visibility = View.VISIBLE
                    binding.errorView.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false

                    // If we have a pending target page from notification, navigate to it
                    pendingTargetPage?.let { target ->
                        navigateToTargetPage(target, pendingItemId)
                        pendingTargetPage = null
                        pendingItemId = null
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        binding.progressBar.visibility = View.GONE
                        binding.swipeRefresh.isRefreshing = false
                        binding.errorView.visibility = View.VISIBLE
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    super.onProgressChanged(view, newProgress)
                    binding.progressBar.progress = newProgress
                }
            }

            loadUrl(tokenManager.getAdminUrl())
        }

        binding.btnRetry.setOnClickListener {
            binding.errorView.visibility = View.GONE
            binding.webView.reload()
        }
    }

    private fun setupSwipeRefresh() {
        // Disable pull-to-refresh spinner since Firebase Realtime sync updates all data automatically
        binding.swipeRefresh.isEnabled = false
    }

    private var pendingTargetPage: String? = null
    private var pendingItemId: String? = null

    private fun handleNotificationIntent(intent: Intent) {
        var target = intent.getStringExtra("EXTRA_TARGET_PAGE")
        var itemId = intent.getStringExtra("EXTRA_ITEM_ID")
        val notifType = intent.getStringExtra("EXTRA_NOTIFICATION_TYPE") ?: intent.getStringExtra("type")

        // If not launched via custom foreground notification, parse direct FCM data extras
        if (target.isNullOrEmpty()) {
            target = intent.getStringExtra("target")
        }
        if (target.isNullOrEmpty()) {
            val clickActionValue = intent.getStringExtra("click_action") ?: intent.getStringExtra("clickAction")
            if (!clickActionValue.isNullOrEmpty() && !clickActionValue.contains("NOTIFICATION_CLICK", ignoreCase = true)) {
                target = clickActionValue
            }
        }
        if (target.isNullOrEmpty() && !notifType.isNullOrEmpty()) {
            target = com.mailfactory.admin.utils.NotificationHelper.getTargetFromType(notifType)
        }

        if (itemId.isNullOrEmpty()) {
            itemId = intent.getStringExtra("id") ?: intent.getStringExtra("submissionId")
        }

        Log.d(TAG, "Handling notification intent: resolved target=$target, id=$itemId, type=$notifType")

        if (!target.isNullOrEmpty()) {
            pendingTargetPage = target
            pendingItemId = itemId

            if (binding.webView.progress == 100) {
                navigateToTargetPage(target, itemId)
                pendingTargetPage = null
                pendingItemId = null
            }
        }
    }

    private fun navigateToTargetPage(target: String, itemId: String?) {
        val js = "if (window.onNotificationDeepLink) { window.onNotificationDeepLink('$target', '${itemId ?: ""}'); }"
        binding.webView.evaluateJavascript(js, null)
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menu?.add(0, 101, 0, "Settings")?.apply {
            setIcon(android.R.drawable.ic_menu_preferences)
            setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
        }
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            101 -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    inner class AdminJsBridge {
        @JavascriptInterface
        fun onAdminLogout() {
            runOnUiThread {
                tokenManager.unregisterToken {
                    Log.d(TAG, "Admin logged out: Token cleared successfully")
                }
            }
        }

        @JavascriptInterface
        fun openSettings() {
            runOnUiThread {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
            }
        }

        @JavascriptInterface
        fun getFcmToken(): String {
            return tokenManager.getLocalToken() ?: ""
        }
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}
