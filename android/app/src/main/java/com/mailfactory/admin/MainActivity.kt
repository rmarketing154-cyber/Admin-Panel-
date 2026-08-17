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
    private val defaultAdminUrl = "https://ais-pre-ke5nti73kgbryjyxjqkkae-659427486150.asia-east1.run.app"

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

        checkNotificationPermission()
        setupWebView()
        setupSwipeRefresh()
        initFcm()
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

            loadUrl(defaultAdminUrl)
        }

        binding.btnRetry.setOnClickListener {
            binding.errorView.visibility = View.GONE
            binding.webView.reload()
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.primary),
            ContextCompat.getColor(this, R.color.accent)
        )
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }
    }

    private var pendingTargetPage: String? = null
    private var pendingItemId: String? = null

    private fun handleNotificationIntent(intent: Intent) {
        val target = intent.getStringExtra("EXTRA_TARGET_PAGE")
        val itemId = intent.getStringExtra("EXTRA_ITEM_ID")
        val notifType = intent.getStringExtra("EXTRA_NOTIFICATION_TYPE")

        Log.d(TAG, "Handling notification intent: target=$target, id=$itemId, type=$notifType")

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
