package com.claudecontext.localdev.service.shell

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.claudecontext.localdev.R
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ShellService : Service() {

    companion object {
        const val CHANNEL_ID = "shell_service_channel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Shell Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Running local development shell"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Claude Local Dev")
            .setContentText("Shell session active")
            .setSmallIcon(R.drawable.ic_terminal)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
