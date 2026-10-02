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

                    // SKIP_UI를 false로 주어 시계 앱 화면이 열리면서 알람이 100% 저장 등록되도록 설정
                    intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    context.startActivity(intent);
                    Toast.makeText(context, "시계 앱으로 " + message + " (" + hour + ":" + String.format("%02d", minute) + ") 알람 전송", Toast.LENGTH_SHORT).show();
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

        /**
         * 1회성 특정 날짜 기반 자체 정밀 알람 등록 및 갤럭시/안드로이드 공식 시계 어플 전송
         * JS 호출: window.AndroidAlarm.setShiftAlarm(year, month, day, hour, minute, shiftType)
         */
        @JavascriptInterface
        public boolean setShiftAlarm(int year, int month, int day, int hour, int minute, String shiftType) {
            Log.d(TAG, "Native setShiftAlarm requested: " + year + "-" + month + "-" + day + " " + hour + ":" + minute + " [" + shiftType + "]");
            try {
                // 1. 앱 내부 정밀 알람 등록 (AlarmManager + FullScreenActivity)
                com.shiftalarm.app.alarm.ShiftAlarmScheduler scheduler = new com.shiftalarm.app.alarm.ShiftAlarmScheduler(context);
                int alarmId = (year * 10000 + month * 100 + day) ^ (hour * 60 + minute);
                if (alarmId < 0) alarmId = -alarmId;
                com.shiftalarm.app.alarm.ShiftAlarmItem item = new com.shiftalarm.app.alarm.ShiftAlarmItem(alarmId, year, month, day, hour, minute, shiftType);
                boolean success = scheduler.schedule(item);

                // 2. 갤럭시/안드로이드 삼성 공식 시계 알람 어플(AlarmClock.ACTION_SET_ALARM)로 즉시 전송 및 전달
                java.util.Calendar cal = java.util.Calendar.getInstance();
                cal.set(year, month - 1, day);
                int dayOfWeek = cal.get(java.util.Calendar.DAY_OF_WEEK); // 1=일, 2=월, 3=화, 4=수, 5=목, 6=금, 7=토

                String msgText = String.format("[%d/%d] %s 근무알람", month, day, shiftType);
                setAlarm(hour, minute, msgText, dayOfWeek);

                if (success) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        String dateStr = String.format("%d월 %d일", month, day);
                        Toast.makeText(context, "⏰ [" + dateStr + "] " + shiftType + " 알람이 시계 앱 및 스마트폰에 등록되었습니다.", Toast.LENGTH_SHORT).show();
                    });
                }
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to schedule exact shift alarm", e);
                return false;
            }
        }

        /**
         * 특정 날짜 알람 취소
         */
        @JavascriptInterface
        public boolean cancelShiftAlarm(int year, int month, int day, int hour, int minute) {
            try {
                com.shiftalarm.app.alarm.ShiftAlarmScheduler scheduler = new com.shiftalarm.app.alarm.ShiftAlarmScheduler(context);
                int alarmId = (year * 10000 + month * 100 + day) ^ (hour * 60 + minute);
                if (alarmId < 0) alarmId = -alarmId;
                scheduler.cancel(alarmId);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to cancel exact shift alarm", e);
                return false;
            }
        }
    }
}
