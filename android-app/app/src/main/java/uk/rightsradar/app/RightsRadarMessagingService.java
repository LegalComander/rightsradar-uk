package uk.rightsradar.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class RightsRadarMessagingService extends FirebaseMessagingService {

    private static final AtomicInteger NEXT_NOTIFICATION_ID = new AtomicInteger(2000);

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        FirebaseMessaging.getInstance().subscribeToTopic(MainActivity.FCM_TOPIC_NEW_LAWS);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification payload = remoteMessage.getNotification();

        String title = firstNonBlank(
                data.get("title"),
                payload == null ? null : payload.getTitle(),
                "RightsRadar UK"
        );
        String body = firstNonBlank(
                data.get("body"),
                payload == null ? null : payload.getBody(),
                "A UK law or rights update is available."
        );
        String url = firstNonBlank(data.get("url"), MainActivity.NEW_LAWS_URL);

        Uri uri = Uri.parse(url);
        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !"rightsradaruk.vercel.app".equalsIgnoreCase(uri.getHost())) {
            url = MainActivity.NEW_LAWS_URL;
        }

        Intent launchIntent = new Intent(this, MainActivity.class)
                .putExtra(MainActivity.EXTRA_NOTIFICATION_URL, url)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                NEXT_NOTIFICATION_ID.get(),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new Notification.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_rightsradar)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NEXT_NOTIFICATION_ID.incrementAndGet(), notification);
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return "";
    }
}
