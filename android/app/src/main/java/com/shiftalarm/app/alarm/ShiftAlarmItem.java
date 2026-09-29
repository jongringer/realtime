package com.shiftalarm.app.alarm;

import java.io.Serializable;
import java.util.Calendar;

public class ShiftAlarmItem implements Serializable {
    private final int id;
    private final int year;
    private final int month; // 1 ~ 12
    private final int day;   // 1 ~ 31
    private final int hour;  // 0 ~ 23
    private final int minute;// 0 ~ 59
    private final String shiftType; // "일근", "야근", "조근", "당직" 등

    public ShiftAlarmItem(int id, int year, int month, int day, int hour, int minute, String shiftType) {
        this.id = id;
        this.year = year;
        this.month = month;
        this.day = day;
        this.hour = hour;
        this.minute = minute;
        this.shiftType = shiftType;
    }

    public int getId() { return id; }
    public int getYear() { return year; }
    public int getMonth() { return month; }
    public int getDay() { return day; }
    public int getHour() { return hour; }
    public int getMinute() { return minute; }
    public String getShiftType() { return shiftType; }

    public String getDateText() {
        return String.format("%04d-%02d-%02d", year, month, day);
    }

    public long getTriggerTimeMillis() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.YEAR, year);
        cal.set(Calendar.MONTH, month - 1);
        cal.set(Calendar.DAY_OF_MONTH, day);
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }
}
