package com.taskwai.app.ui

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.taskwai.app.auth.GoogleSignInManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TaskwaiWebInterface(
    private val webView: WebView,
    private val scope: CoroutineScope,
    private val signInManager: GoogleSignInManager
) {
    @JavascriptInterface
    fun triggerGoogleLogin() {
        scope.launch {
            val idToken = signInManager.signIn()
            if (idToken != null) {
                // Send ID token back to the web app
                // This assumes the web app has a function 'onNativeGoogleLogin'
                launch(Dispatchers.Main) {
                    webView.evaluateJavascript("window.onNativeGoogleLogin('$idToken')", null)
                }
            }
        }
    }
}
