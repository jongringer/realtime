package com.shiftalarm.app.alarm;

import android.app.KeyguardManager;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlarmFullScreenActivity extends AppCompatActivity {

    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        turnScreenOnAndDismissKeyguard();

        // 코드로 동적 UI 구성 (외부 XML 리소스 의존성 없음)
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.parseColor("#121212"));
        layout.setPadding(48, 48, 48, 48);

        String dateText = getIntent().getStringExtra("DATE_TEXT");
        if (dateText == null) dateText = "";
        String shiftType = getIntent().getStringExtra("SHIFT_TYPE");
        if (shiftType == null) shiftType = "근무";

        TextView titleView = new TextView(this);
        titleView.setText("📅 " + dateText);
        titleView.setTextSize(22f);
        titleView.setTextColor(Color.LTGRAY);
        titleView.setGravity(Gravity.CENTER);

        TextView shiftView = new TextView(this);
        shiftView.setText("[" + shiftType + "] 알람");
        shiftView.setTextSize(34f);
        shiftView.setTypeface(null, Typeface.BOLD);
        shiftView.setTextColor(Color.WHITE);
        shiftView.setGravity(Gravity.CENTER);
        shiftView.setPadding(0, 16, 0, 48);

        Button dismissButton = new Button(this);
        dismissButton.setText("알람 해제 및 확인");
        dismissButton.setTextSize(18f);
        dismissButton.setTextColor(Color.WHITE);
        dismissButton.setBackgroundColor(Color.parseColor("#dc2626"));
        dismissButton.setPadding(32, 24, 32, 24);
        dismissButton.setOnClickListener(v -> {
            stopAlarm();
            finish();
        });

        layout.addView(titleView);
        layout.addView(shiftView);
        layout.addView(dismissButton);
        setContentView(layout);

        startAlarmSoundAndVibration();
    }

    private void turnScreenOnAndDismissKeyguard() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    private void startAlarmSoundAndVibration() {
        try {
            Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alertUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
            }
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vibratorManager != null) {
                    vibrator = vibratorManager.getDefaultVibrator();
                }
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }

            long[] pattern = new long[]{0, 800, 800};
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopAlarm() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
            mediaPlayer = null;
        }
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception e) {
                e.printStackTrace();
            }
            vibrator = null;
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopAlarm();
    }
}
