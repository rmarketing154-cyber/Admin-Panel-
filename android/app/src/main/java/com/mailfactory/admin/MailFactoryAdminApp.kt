package com.mailfactory.admin

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.database.FirebaseDatabase
import com.mailfactory.admin.utils.NotificationHelper

class MailFactoryAdminApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        
        // Enable disk persistence for Firebase Realtime Database
        try {
            FirebaseDatabase.getInstance().setPersistenceEnabled(true)
        } catch (e: Exception) {
            // Already initialized or not supported
        }

        // Create high-priority notification channels
        NotificationHelper.createNotificationChannels(this)
    }
}
