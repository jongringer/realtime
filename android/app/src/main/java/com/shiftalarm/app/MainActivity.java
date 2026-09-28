package com.shiftalarm.app;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.AlarmClock;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ShiftAlarmApp";
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new NativeAlarmInterface(this), "AndroidAlarm");
                Log.d(TAG, "Native AndroidAlarm JavascriptInterface registered successfully.");

                // 앱 열자마자 화면 어디서나 핀치 줌인/줌아웃 100% 즉시 활성화
                enablePinchZoom();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }

        // Android 뒤로가기(Back Button) 이벤트 우선순위 제어
        // 팝업/모달이 열려있으면 팝업만 먼저 닫고, 모두 닫힌 기본 상태에서만 홈 복귀/앱 종료 처리
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "(function() { return (window.handleAppBackButton && window.handleAppBackButton()) ? 'MODAL_CLOSED' : 'NO_MODAL'; })();",
                        value -> {
                            if (value != null && value.contains("MODAL_CLOSED")) {
                                Log.d(TAG, "Back button handled: modal was closed successfully.");
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
                settings.setSupportZoom(true);
                settings.setBuiltInZoomControls(true);
                settings.setDisplayZoomControls(false); // 화면 위 불필요한 +/- 줌 버튼 UI 제거, 핀치 제스처만 깔끔하게 동작
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
                Log.d(TAG, "Native WebView pinch zoom enabled successfully.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable pinch zoom", e);
        }
    }

    public static class NativeAlarmInterface {
        private final Context context;

        public NativeAlarmInterface(Context context) {
            this.context = context;
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

                    // 일주일 요일(1=일, 2=월, 3=화, 4=수, 5=목, 6=금, 7=토) 적용
                    if (dayOfWeek >= 1 && dayOfWeek <= 7) {
                        ArrayList<Integer> days = new ArrayList<>();
                        days.add(dayOfWeek);
                        intent.putExtra(AlarmClock.EXTRA_DAYS, days);
                    }

                    // SKIP_UI를 false로 주어야 시계 앱 화면이 직접 열리며 확실하게 알람이 등록/저장됨
                    intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    context.startActivity(intent);
                    Toast.makeText(context, "시계 앱으로 " + message + " (" + hour + ":" + String.format("%02d", minute) + ") 알람을 설정합니다.", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start AlarmClock intent", e);
                    try {
                        // Fallback: 시계 앱 알람 목록 직접 열기
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
    }
}
