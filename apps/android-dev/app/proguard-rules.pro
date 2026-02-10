# Claude Local Dev ProGuard rules

# Keep Gson serialization
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.claudecontext.localdev.service.claude.ClaudeApiService$* { *; }
-keep class com.claudecontext.localdev.data.models.** { *; }

# Keep Room entities
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
