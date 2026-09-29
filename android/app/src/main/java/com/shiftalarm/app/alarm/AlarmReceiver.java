package com.shiftalarm.app.alarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    public static final String CHANNEL_ID = "SHIFT_WORK_ALARM_CHANNEL";

    @Override
    public void onReceive(Context context, Intent intent) {
        int alarmId = intent.getIntExtra("ALARM_ID", -1);
        String dateText = intent.getStringExtra("DATE_TEXT");
        if (dateText == null) dateText = "오늘";
        String shiftType = intent.getStringExtra("SHIFT_TYPE");
        if (shiftType == null) shiftType = "근무";

        Log.d(TAG, "Alarm received: ID=" + alarmId + ", Date=" + dateText + ", Shift=" + shiftType);

        // 1. 만료 처리 (울린 알람은 즉시 영구 저장소에서 자동 삭제)
        cleanupExpiredAlarm(context, alarmId);

        // 2. 화면이 꺼져있을 때 화면 깨우기를 위한 WakeLock (5초 유지)
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "ShiftAlarm:AlarmWakeLock"
            );
            wakeLock.acquire(5000);
        }

        // 3. 전체화면 액티비티 인텐트 생성
        Intent fullScreenIntent = new Intent(context, AlarmFullScreenActivity.class);
        fullScreenIntent.putExtra("ALARM_ID", alarmId);
        fullScreenIntent.putExtra("DATE_TEXT", dateText);
        fullScreenIntent.putExtra("SHIFT_TYPE", shiftType);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            alarmId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 4. 고우선순위 알림 채널 및 빌더 생성
        createNotificationChannel(context);

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("[" + dateText + "] " + shiftType + " 알람")
            .setContentText("설정된 근무 시간이 되었습니다.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true) // 화면 꺼짐/잠금 시 즉시 액티비티 실행
            .setAutoCancel(true);

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(alarmId, notificationBuilder.build());
        }

        // 전체화면 액티비티 직접 시작 (Android 10+ 백그라운드 제약 보조)
        try {
            context.startActivity(fullScreenIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start full screen activity directly", e);
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void cleanupExpiredAlarm(Context context, int alarmId) {
        if (alarmId != -1) {
            ShiftAlarmScheduler scheduler = new ShiftAlarmScheduler(context);
            scheduler.removeAlarmFromPrefs(alarmId);
            Log.d(TAG, "Expired alarm cleaned up from prefs: ID=" + alarmId);
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (soundUri == null) {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "근무 알람 채널",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("단발성 근무 일정 전용 고우선순위 알람");
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
