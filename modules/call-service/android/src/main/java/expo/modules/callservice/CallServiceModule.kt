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
    Events(TASK_REMOVED)

    OnCreate {
      CallService.taskRemovedListener = { sendEvent(TASK_REMOVED) }
    }

    OnDestroy {
      CallService.taskRemovedListener = null
    }

    Function<Boolean>("start") {
      startService()
    }

    Function("stop") {
      context.stopService(Intent(context, CallService::class.java))
    }
  }

  /**
   * False means the call screen should treat background audio as unavailable. A later
   * startForeground failure inside the service cannot be reported here, only logged.
   */
  private fun startService(): Boolean {
    // Without either permission the service could not call startForeground in time and Android would crash the app.
    val allowed = listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
      .any { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
    if (!allowed) {
      Log.w(TAG, "Not starting call service: no microphone or camera permission")
      return false
    }
    val intent = Intent(context, CallService::class.java)
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      true
    } catch (e: Exception) {
      // Android 12+ blocks starting from the background; the call itself must not fail over this.
      Log.w(TAG, "Could not start call service: ${e.message}")
      false
    }
  }

  companion object {
    private const val TAG = "CallService"
    private const val TASK_REMOVED = "onTaskRemoved"
  }
}
