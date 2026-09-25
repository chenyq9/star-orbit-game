package com.chenyq.starorbit;
import android.app.*;import android.os.*;import android.view.*;import android.webkit.*;import android.graphics.Color;
public class MainActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b); getWindow().setStatusBarColor(Color.TRANSPARENT); getWindow().setNavigationBarColor(Color.rgb(3,7,18)); getWindow().getDecorView().setSystemUiVisibility(5894|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY); WebView w=new WebView(this); w.setBackgroundColor(Color.rgb(3,7,18)); w.getSettings().setJavaScriptEnabled(true); w.getSettings().setDomStorageEnabled(true); w.setOverScrollMode(View.OVER_SCROLL_NEVER); w.addJavascriptInterface(new Object(){@JavascriptInterface public void pulse(int ms){ if(Build.VERSION.SDK_INT>=26)((Vibrator)getSystemService(VIBRATOR_SERVICE)).vibrate(VibrationEffect.createOneShot(ms,80)); else ((Vibrator)getSystemService(VIBRATOR_SERVICE)).vibrate(ms);}},"Native"); w.loadUrl("file:///android_asset/index.html"); setContentView(w);}
 @Override public void onBackPressed(){ WebView w=(WebView)findViewById(android.R.id.content).getRootView(); super.onBackPressed(); }
}
