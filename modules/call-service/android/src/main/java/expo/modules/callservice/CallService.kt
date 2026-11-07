package expo.modules.callservice

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log

/** Keeps the consultation's mic (and camera) alive while the app is in the background. */
class CallService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      val notification = buildNotification()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, grantedTypes())
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (e: Exception) {
      // Android refuses a type whose permission is missing; the call still works in the foreground.
      Log.w(TAG, "Could not start call service: ${e.message}")
      stopSelf()
    }
    return START_NOT_STICKY
  }

  // Swiping the app away ends the call, so the notification must not outlive it.
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
  }

  private fun granted(permission: String) =
    checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun grantedTypes(): Int {
    var types = 0
    if (granted(Manifest.permission.RECORD_AUDIO)) types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
    if (granted(Manifest.permission.CAMERA)) types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
    if (types == 0) throw IllegalStateException("No microphone or camera permission")
    return types
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Consultation calls", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    }
    val tap = open?.let { PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
    return builder
      .setContentTitle("Consultation in progress")
      .setContentText("Tap to return to your call")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setContentIntent(tap)
      .build()
  }

  companion object {
    private const val TAG = "CallService"
    private const val CHANNEL_ID = "consultation_call"
    private const val NOTIFICATION_ID = 4711
  }
}
