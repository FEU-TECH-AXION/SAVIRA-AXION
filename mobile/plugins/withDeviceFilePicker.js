const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const moduleSource = `package com.axion.savira

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class DeviceFilePickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pendingPromise: Promise? = null

  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_CODE) return

      val promise = pendingPromise ?: return
      pendingPromise = null

      if (resultCode != Activity.RESULT_OK || data == null) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("canceled", true)
          putNull("assets")
        })
        return
      }

      try {
        val assets = Arguments.createArray()
        val clipData = data.clipData

        if (clipData != null) {
          for (index in 0 until clipData.itemCount) {
            assets.pushMap(cacheFile(clipData.getItemAt(index).uri))
          }
        } else {
          data.data?.let { assets.pushMap(cacheFile(it)) }
        }

        promise.resolve(Arguments.createMap().apply {
          putBoolean("canceled", false)
          putArray("assets", assets)
        })
      } catch (error: Exception) {
        promise.reject("DEVICE_FILE_PICKER_ERROR", "Could not pick files.", error)
      }
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "DeviceFilePicker"

  @ReactMethod
  fun openFiles(promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("DEVICE_FILE_PICKER_BUSY", "A file picker is already open.")
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Could not open the file picker.")
      return
    }

    pendingPromise = promise

    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "*/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }

    val launchIntent = listOf("com.google.android.documentsui", "com.android.documentsui")
      .firstNotNullOfOrNull { packageName ->
        Intent(intent).setPackage(packageName).takeIf {
          it.resolveActivity(activity.packageManager) != null
        }
      } ?: intent

    try {
      activity.startActivityForResult(launchIntent, REQUEST_CODE)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("DEVICE_FILE_PICKER_ERROR", "Could not open the file picker.", error)
    }
  }

  private fun cacheFile(uri: Uri) = Arguments.createMap().apply {
    val resolver = reactContext.contentResolver
    val name = (readName(uri) ?: "evidence-file-\${System.currentTimeMillis()}")
      .replace(Regex("""[\\\\/:*?"<>|]"""), "_")
    val mimeType = resolver.getType(uri) ?: "application/octet-stream"
    val outputDir = File(reactContext.cacheDir, "DeviceFilePicker").apply { mkdirs() }
    val outputFile = File(outputDir, "\${System.currentTimeMillis()}-$name")

    resolver.openInputStream(uri).use { input ->
      FileOutputStream(outputFile).use { output ->
        input?.copyTo(output) ?: throw IllegalStateException("Could not read selected file.")
      }
    }

    putString("name", name)
    putDouble("size", outputFile.length().toDouble())
    putString("uri", Uri.fromFile(outputFile).toString())
    putString("mimeType", mimeType)
  }

  private fun readName(uri: Uri): String? {
    var cursor: Cursor? = null
    return try {
      cursor = reactContext.contentResolver.query(uri, null, null, null, null)
      val nameIndex = cursor?.getColumnIndex(OpenableColumns.DISPLAY_NAME) ?: -1
      if (cursor?.moveToFirst() == true && nameIndex >= 0) cursor.getString(nameIndex) else null
    } finally {
      cursor?.close()
    }
  }

  companion object {
    private const val REQUEST_CODE = 7305
  }
}
`;

const packageSource = `package com.axion.savira

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DeviceFilePickerPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(DeviceFilePickerModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

function ensureDeviceFilePicker(androidProjectRoot) {
  const sourceDir = path.join(
    androidProjectRoot,
    "app",
    "src",
    "main",
    "java",
    "com",
    "axion",
    "savira"
  );
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "DeviceFilePickerModule.kt"), moduleSource);
  fs.writeFileSync(path.join(sourceDir, "DeviceFilePickerPackage.kt"), packageSource);

  const mainApplicationPath = path.join(sourceDir, "MainApplication.kt");
  if (!fs.existsSync(mainApplicationPath)) return;

  const mainApplication = fs.readFileSync(mainApplicationPath, "utf8");
  if (mainApplication.includes("add(DeviceFilePickerPackage())")) return;

  fs.writeFileSync(
    mainApplicationPath,
    mainApplication.replace(
      "// add(MyReactNativePackage())",
      "add(DeviceFilePickerPackage())"
    )
  );
}

module.exports = function withDeviceFilePicker(config) {
  return withDangerousMod(config, [
    "android",
    (modConfig) => {
      ensureDeviceFilePicker(modConfig.modRequest.platformProjectRoot);
      return modConfig;
    },
  ]);
};
