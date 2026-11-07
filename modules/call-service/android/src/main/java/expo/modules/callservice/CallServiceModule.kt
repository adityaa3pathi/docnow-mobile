package expo.modules.callservice

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallServiceModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext) { "React context is not ready" }

  override fun definition() = ModuleDefinition {
    Name("CallService")

    Function("start") {
      // Without either permission the service could not call startForeground in time and Android would crash the app.
      val allowed = listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
        .any { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
      if (!allowed) return@Function
      val intent = Intent(context, CallService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      } catch (e: Exception) {
        // Android 12+ blocks starting from the background; the call itself must not fail over this.
        Log.w("CallService", "Could not start call service: ${e.message}")
      }
    }

    Function("stop") {
      context.stopService(Intent(context, CallService::class.java))
    }
  }
}
