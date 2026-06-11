// utils/triggerNotification.ts
import * as Notifications from 'expo-notifications';

export async function triggerLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // immédiate
  });
}