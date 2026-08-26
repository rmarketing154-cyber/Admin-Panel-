# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class * extends android.webkit.WebViewClient {
    public <methods>;
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public <methods>;
}

-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

-keep class com.mailfactory.admin.data.** { *; }
-keep class com.mailfactory.admin.ui.** { *; }
