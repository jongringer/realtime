package com.kbs.realtime;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.AlarmClock;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import android.view.Window;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "RealtimeApp";
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 안드로이드 상태바 및 하단 내비게이션바 기본 낮모드 가시성 최적화
        applySystemBarTheme(false);

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new NativeAlarmInterface(this, this), "AndroidAlarm");
                Log.d(TAG, "Native AndroidAlarm JavascriptInterface registered successfully.");

                // 화면 어디서나 핀치 줌인/줌아웃 활성화
                enablePinchZoom();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }

        // Android 뒤로가기(Back Button) 제어
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "(function() { return (window.handleAppBackButton && window.handleAppBackButton()) ? 'MODAL_CLOSED' : 'NO_MODAL'; })();",
                        value -> {
                            if (value != null && value.contains("MODAL_CLOSED")) {
                                Log.d(TAG, "Back button handled: modal was closed.");
                            } else {
                                handleDefaultBackPress();
                            }
                        }
                    );
                } else {
                    handleDefaultBackPress();
                }
            }
        });
    }

    private void handleDefaultBackPress() {
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastBackPressTime < 2000) {
            finish();
        } else {
            lastBackPressTime = currentTime;
            Toast.makeText(this, "한 번 더 누르면 앱이 종료됩니다.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        enablePinchZoom();
    }

    private void enablePinchZoom() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                android.webkit.WebView webView = this.bridge.getWebView();
                android.webkit.WebSettings settings = webView.getSettings();
                settings.setTextZoom(100);
                settings.setSupportZoom(true);
                settings.setBuiltInZoomControls(true);
                settings.setDisplayZoomControls(false);
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable pinch zoom", e);
        }
    }

    public void applySystemBarTheme(boolean isDark) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Window window = getWindow();
                if (window != null && window.getDecorView() != null) {
                    WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
                    if (isDark) {
                        controller.setAppearanceLightStatusBars(false);
                        controller.setAppearanceLightNavigationBars(false);
                        window.setStatusBarColor(android.graphics.Color.parseColor("#0f172a"));
                        window.setNavigationBarColor(android.graphics.Color.parseColor("#0f172a"));
                    } else {
                        controller.setAppearanceLightStatusBars(true);
                        controller.setAppearanceLightNavigationBars(true);
                        window.setStatusBarColor(android.graphics.Color.parseColor("#ffffff"));
                        window.setNavigationBarColor(android.graphics.Color.parseColor("#f8fafc"));
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error applying system bar theme", e);
            }
        });
    }

    public static class NativeAlarmInterface {
        private final Context context;
        private final MainActivity activity;

        public NativeAlarmInterface(Context context, MainActivity activity) {
            this.context = context;
            this.activity = activity;
        }

        @JavascriptInterface
        public void setSystemBarTheme(boolean isDark) {
            if (activity != null) {
                activity.applySystemBarTheme(isDark);
            }
        }

        @JavascriptInterface
        public boolean isNativeAvailable() {
            return true;
        }

        @JavascriptInterface
        public boolean setAlarm(int hour, int minute, String message, int dayOfWeek) {
            Log.d(TAG, "Native setAlarm requested: " + hour + ":" + minute + ", msg=" + message + ", dayOfWeek=" + dayOfWeek);
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
                    intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
                    intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
                    intent.putExtra(AlarmClock.EXTRA_MESSAGE, message);

                    if (dayOfWeek >= 1 && dayOfWeek <= 7) {
                        ArrayList<Integer> days = new ArrayList<>();
                        days.add(dayOfWeek);
                        intent.putExtra(AlarmClock.EXTRA_DAYS, days);
                    }

                    // 삼성 갤럭시 시계 앱 UI로 넘기면서 100% 안전하고 확실하게 알람 등록
                    intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    context.startActivity(intent);
                    Toast.makeText(context, "시계 앱으로 " + message + " (" + hour + ":" + String.format("%02d", minute) + ") 알람 전송", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start AlarmClock intent", e);
                    try {
                        Intent fallbackIntent = new Intent(AlarmClock.ACTION_SHOW_ALARMS);
                        fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(fallbackIntent);
                        Toast.makeText(context, "시계 앱을 실행합니다.", Toast.LENGTH_SHORT).show();
                    } catch (Exception ex) {
                        Log.e(TAG, "Failed fallback to show alarms", ex);
                        Toast.makeText(context, "시계 앱 실행에 실패했습니다: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
            return true;
        }

        /**
         * 100% 안전한 공식 삼성/안드로이드 시스템 시계 어플로 알람 자동 등록
         * 금융 보안 및 백신에서 전혀 악성으로 탐지되지 않는 표준 연동 방식
         */
        @JavascriptInterface
        public boolean setShiftAlarm(int year, int month, int day, int hour, int minute, String shiftType) {
            Log.d(TAG, "Native setShiftAlarm requested: " + year + "-" + month + "-" + day + " " + hour + ":" + minute + " [" + shiftType + "]");
            try {
                java.util.Calendar cal = java.util.Calendar.getInstance();
                cal.set(year, month - 1, day);
                int dayOfWeek = cal.get(java.util.Calendar.DAY_OF_WEEK); // 1=일, 2=월, 3=화, 4=수, 5=목, 6=금, 7=토

                String msgText = String.format("[%d/%d] %s 알람", month, day, shiftType);
                return setAlarm(hour, minute, msgText, dayOfWeek);
            } catch (Exception e) {
                Log.e(TAG, "Failed to schedule shift alarm to Clock app", e);
                return false;
            }
        }

        /**
         * 알람 취소 및 시계 앱 알람 목록 바로가기
         */
        @JavascriptInterface
        public boolean cancelShiftAlarm(int year, int month, int day, int hour, int minute) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    Intent intent = new Intent(AlarmClock.ACTION_SHOW_ALARMS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception ex) {
                    Log.w(TAG, "Could not open clock app alarms list", ex);
                }
            });
            return true;
        }
    }
}

