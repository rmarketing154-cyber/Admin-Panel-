package com.mailfactory.admin.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.database.ChildEventListener
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.mailfactory.admin.MainActivity
import com.mailfactory.admin.R
import com.mailfactory.admin.data.AdminTokenManager
import com.mailfactory.admin.utils.NotificationHelper

/**
 * Background Realtime Listener Service
 * Directly listens to Firebase Realtime Database changes without requiring Cloud Functions or Blaze Plan.
 */
class RealtimeAlertService : Service() {

    private val db = FirebaseDatabase.getInstance().reference
    private lateinit var tokenManager: AdminTokenManager
    private val startTime = System.currentTimeMillis()

    override fun onCreate() {
        super.onCreate()
        tokenManager = AdminTokenManager(applicationContext)
        Log.d(TAG, "RealtimeAlertService created at $startTime")
        startForegroundServiceNotification()
        attachDatabaseListeners()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startForegroundServiceNotification() {
        val channelId = "channel_live_sync"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Live Data Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps real-time Firebase connection alive for instant alerts"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Mail Factory Admin Active")
            .setContentText("Listening for real-time submissions, withdrawals & chats")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(1001, notification)
    }

    private fun attachDatabaseListeners() {
        // 1. Listen for new Submissions
        db.child("submissions").addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val timestamp = snapshot.child("timestamp").getValue(Long::class.java) 
                        ?: snapshot.child("createdAt").getValue(Long::class.java) ?: 0L
                    val status = snapshot.child("status").getValue(String::class.java) ?: "pending"

                    if (timestamp >= (startTime - 5000) && status.equals("pending", ignoreCase = true)) {
                        val emailCount = snapshot.child("count").value?.toString() 
                            ?: snapshot.child("emails").childrenCount.toString()
                        val username = snapshot.child("username").getValue(String::class.java) 
                            ?: snapshot.child("userEmail").getValue(String::class.java) ?: "User"

                        if (tokenManager.isGmailEnabled()) {
                            NotificationHelper.showNotification(
                                context = applicationContext,
                                title = "📧 নতুন Gmail সাবমিশন এসেছে",
                                body = "$username $emailCount টি জিমেইল সাবমিট করেছে। চেক করতে ট্যাপ করুন।",
                                type = "gmail",
                                target = "submissions",
                                id = snapshot.key
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing submission: ${e.message}")
                }
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })

        // 2. Listen for new Withdrawal Requests
        db.child("withdraw_requests").addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val timestamp = snapshot.child("timestamp").getValue(Long::class.java) 
                        ?: snapshot.child("createdAt").getValue(Long::class.java) ?: 0L
                    val status = snapshot.child("status").getValue(String::class.java) ?: "pending"

                    if (timestamp >= (startTime - 5000) && status.equals("pending", ignoreCase = true)) {
                        val amount = snapshot.child("amount").value?.toString() ?: "0"
                        val method = snapshot.child("paymentMethod").getValue(String::class.java) 
                            ?: snapshot.child("method").getValue(String::class.java) ?: "bKash/Nagad"

                        if (tokenManager.isWithdrawalEnabled()) {
                            NotificationHelper.showNotification(
                                context = applicationContext,
                                title = "💰 নতুন উত্তোলন রিকোয়েস্ট",
                                body = "৳$amount তোলার জন্য নতুন রিকোয়েস্ট এসেছে ($method)।",
                                type = "withdrawal",
                                target = "withdrawals",
                                id = snapshot.key
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing withdrawal: ${e.message}")
                }
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })

        // 3. Listen for new Users
        db.child("users").addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val createdAt = snapshot.child("createdAt").getValue(Long::class.java) 
                        ?: snapshot.child("joinedAt").getValue(Long::class.java) ?: 0L
                    
                    if (createdAt >= (startTime - 5000)) {
                        val email = snapshot.child("email").getValue(String::class.java) 
                            ?: snapshot.child("name").getValue(String::class.java) ?: "New Member"

                        if (tokenManager.isNewUserEnabled()) {
                            NotificationHelper.showNotification(
                                context = applicationContext,
                                title = "👤 নতুন সদস্য রেজিস্ট্রেশন",
                                body = "$email এইমাত্র প্ল্যাটফর্মে যুক্ত হয়েছেন।",
                                type = "new_user",
                                target = "users",
                                id = snapshot.key
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing user: ${e.message}")
                }
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })

        // 4. Listen for Support Chats
        db.child("support_chats").addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                attachChatMessagesListener(snapshot.key ?: return)
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })

        // 5. Listen for Custom Admin Dispatched Notifications
        db.child("admin_notifications").addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val timestamp = snapshot.child("timestamp").getValue(Long::class.java) ?: 0L
                    if (timestamp >= (startTime - 5000)) {
                        val title = snapshot.child("title").getValue(String::class.java) ?: "Admin Notification"
                        val message = snapshot.child("message").getValue(String::class.java) 
                            ?: snapshot.child("body").getValue(String::class.java) ?: "New message dispatched"
                        val type = snapshot.child("type").getValue(String::class.java) ?: "general"

                        NotificationHelper.showNotification(
                            context = applicationContext,
                            title = "📢 $title",
                            body = message,
                            type = type,
                            target = "dashboard",
                            id = snapshot.key
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing admin notification: ${e.message}")
                }
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    private fun attachChatMessagesListener(userId: String) {
        db.child("support_chats").child(userId).addChildEventListener(object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                try {
                    val timestamp = snapshot.child("timestamp").getValue(Long::class.java) ?: 0L
                    val from = snapshot.child("from").getValue(String::class.java) ?: ""
                    val isRead = snapshot.child("read").getValue(Boolean::class.java) ?: false

                    if (timestamp >= (startTime - 5000) && from == "user" && !isRead) {
                        val text = snapshot.child("message").getValue(String::class.java) 
                            ?: snapshot.child("text").getValue(String::class.java) ?: "New message"

                        if (tokenManager.isReportEnabled()) {
                            NotificationHelper.showNotification(
                                context = applicationContext,
                                title = "💬 সাপোর্টে নতুন মেসেজ",
                                body = text,
                                type = "support",
                                target = "chat",
                                id = userId
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing chat msg: ${e.message}")
                }
            }
            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onChildRemoved(snapshot: DataSnapshot) {}
            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "RealtimeAlertService destroyed")
    }

    companion object {
        private const val TAG = "RealtimeAlertService"
        fun start(context: Context) {
            val intent = Intent(context, RealtimeAlertService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
