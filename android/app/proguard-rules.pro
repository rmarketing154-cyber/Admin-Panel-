# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.webkit.JavascriptInterface <methods>;
}
-dontwarn com.google.firebase.**
