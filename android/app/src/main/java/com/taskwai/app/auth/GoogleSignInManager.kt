package com.taskwai.app.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.SecureRandom
import android.util.Base64

class GoogleSignInManager(private val context: Context) {
    private val credentialManager = CredentialManager.create(context)
    private val webClientId = "888780289762-gpiud6mhos00kiljpgnk779tunli4ijr.apps.googleusercontent.com"

    suspend fun signIn(): String? = withContext(Dispatchers.Main) {
        try {
            val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(webClientId)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build()

            val result = credentialManager.getCredential(context, request)
            Log.d("GoogleSignInManager", "Credential received successfully")

            val credential = result.credential
            if (credential is CustomCredential && 
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                Log.d("GoogleSignInManager", "Token extracted: ${googleIdTokenCredential.idToken.take(10)}...")
                return@withContext googleIdTokenCredential.idToken
            }
            null
        } catch (e: Exception) {
            Log.e("GoogleSignInManager", "Sign in failed: ${e.message}")
            null
        }
    }

    private fun generateNonce(length: Int = 32): String {
        val bytes = ByteArray(length)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP or Base64.URL_SAFE or Base64.NO_PADDING)
    }
}
