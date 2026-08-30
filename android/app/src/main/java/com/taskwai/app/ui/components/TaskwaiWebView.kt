package com.taskwai.app.ui.components

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import com.taskwai.app.auth.GoogleSignInManager
import com.taskwai.app.ui.TaskwaiWebInterface
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun TaskwaiWebView(
    url: String,
    modifier: Modifier = Modifier
) {
    var webView: WebView? by remember { mutableStateOf(null) }
    var canGoBack by remember { mutableStateOf(false) }
    var isInterceptingGoogleLogin by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val signInManager = remember { GoogleSignInManager(context) }

    BackHandler(enabled = canGoBack) {
        webView?.goBack()
    }

    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    builtInZoomControls = false
                    displayZoomControls = false
                    setSupportZoom(false)
                    cacheMode = WebSettings.LOAD_DEFAULT
                    setSupportMultipleWindows(false)
                    javaScriptCanOpenWindowsAutomatically = true
                    // Help Google OAuth by using a mobile-friendly UA
                    userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                }

                webViewClient = object : WebViewClient() {
                    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        canGoBack = view?.canGoBack() ?: false
                    }

                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        canGoBack = view?.canGoBack() ?: false
                        
                        // Inject script to hijack Google Login button
                        val hijackScript = """
                            (function() {
                                function tryHijack() {
                                    // Look for Google Login buttons (common patterns)
                                    const buttons = document.querySelectorAll('button, div, a');
                                    for (let btn of buttons) {
                                        const text = btn.innerText || '';
                                        if (text.toLowerCase().includes('google') && (text.toLowerCase().includes('login') || text.toLowerCase().includes('masuk') || text.toLowerCase().includes('sign'))) {
                                            if (btn.dataset.hijacked) continue;
                                            btn.dataset.hijacked = 'true';
                                            btn.addEventListener('click', function(e) {
                                                console.log('Taskwai: Google button clicked, calling native');
                                                if (window.AndroidNative) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    window.AndroidNative.triggerGoogleLogin();
                                                }
                                            }, true);
                                        }
                                    }
                                }
                                // Run multiple times to catch dynamic buttons
                                tryHijack();
                                setTimeout(tryHijack, 2000);
                                setTimeout(tryHijack, 5000);
                            })();
                        """.trimIndent()
                        view?.evaluateJavascript(hijackScript, null)
                    }

                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): Boolean {
                        val uri = request?.url ?: return false
                        val requestUrl = uri.toString()
                        
                        // Stay in the app for taskwai.com
                        if (requestUrl.contains("taskwai.com")) {
                            return false
                        }
                        
                        // If it's a Google Auth URL that somehow escaped hijacking, 
                        // we'll let it load normally as a fallback
                        if (requestUrl.contains("accounts.google.com")) {
                            return false 
                        }

                        // Handle external intents (mailto/tel)
                        if (!requestUrl.startsWith("http")) {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, uri)
                                context.startActivity(intent)
                                return true
                            } catch (e: Exception) {
                                return false
                            }
                        }
                        
                        return false
                    }
                }

                webChromeClient = object : WebChromeClient() {}

                // Enable cookies
                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                loadUrl(url)
                webView = this

                // Add Native Interface
                addJavascriptInterface(
                    TaskwaiWebInterface(this, scope, signInManager),
                    "AndroidNative"
                )
            }
        },
        update = {
            // URL updates could be handled here if needed
        }
    )
}
