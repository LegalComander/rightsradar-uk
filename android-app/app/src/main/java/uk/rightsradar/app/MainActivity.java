package uk.rightsradar.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {

    private static final String HOME_URL = "https://rightsradaruk.vercel.app/";
    private static final String NEW_LAWS_URL = HOME_URL + "new-laws.html";
    private static final String ALERTS_URL = HOME_URL + "alerts.html";
    private static final String APP_HOST = "rightsradaruk.vercel.app";
    private static final String PREFS_NAME = "rightsradar_android";
    private static final String PREF_SAVED_PAGES = "saved_pages";
    private static final String BOOKMARK_SEPARATOR = "\u001F";
    private static final String NOTIFICATION_CHANNEL_ID = "law_updates";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1001;

    private WebView webView;
    private ProgressBar progressBar;
    private View errorPanel;
    private String retryUrl = HOME_URL;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        View root = findViewById(R.id.root);
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorPanel = findViewById(R.id.errorPanel);
        Button retryButton = findViewById(R.id.retryButton);

        applySystemBarInsets(root);
        createNotificationChannel();
        configureWebView();
        configureNativeNavigation();

        retryButton.setOnClickListener(v -> {
            errorPanel.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(retryUrl);
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    this::handleBack
            );
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(resolveLaunchUrl());
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " RightsRadarAndroid/1.1");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new RightsRadarWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                openExternal(Uri.parse(url))
        );
    }

    private void configureNativeNavigation() {
        findViewById(R.id.navHome).setOnClickListener(v -> webView.loadUrl(HOME_URL));
        findViewById(R.id.navLaws).setOnClickListener(v -> webView.loadUrl(NEW_LAWS_URL));
        findViewById(R.id.navAlerts).setOnClickListener(v -> {
            ensureNotificationPermission();
            webView.loadUrl(ALERTS_URL);
        });
        findViewById(R.id.navSave).setOnClickListener(v -> toggleSaveCurrentPage());
        findViewById(R.id.navSaved).setOnClickListener(v -> showSavedPages());
        findViewById(R.id.navShare).setOnClickListener(v -> shareCurrentPage());
    }

    private String resolveLaunchUrl() {
        Uri data = getIntent() == null ? null : getIntent().getData();
        if (data != null && isInternal(data)) {
            return data.toString();
        }
        return HOME_URL;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    getString(R.string.notification_channel_name),
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription(getString(R.string.notification_channel_description));
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST
            );
        }
    }

    private void toggleSaveCurrentPage() {
        String url = webView.getUrl();
        if (url == null || !isInternal(Uri.parse(url))) {
            Toast.makeText(this, R.string.saved_empty, Toast.LENGTH_SHORT).show();
            return;
        }

        String title = webView.getTitle();
        if (title == null || title.trim().isEmpty()) {
            title = "RightsRadar UK";
        }
        title = title.trim();

        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        Set<String> pages = new LinkedHashSet<>(
                preferences.getStringSet(PREF_SAVED_PAGES, Collections.emptySet())
        );

        String existing = findSavedEntryByUrl(pages, url);
        if (existing != null) {
            pages.remove(existing);
            preferences.edit().putStringSet(PREF_SAVED_PAGES, pages).apply();
            Toast.makeText(this, R.string.saved_removed, Toast.LENGTH_SHORT).show();
        } else {
            pages.add(encodeBookmark(title, url));
            preferences.edit().putStringSet(PREF_SAVED_PAGES, pages).apply();
            Toast.makeText(this, R.string.saved_added, Toast.LENGTH_SHORT).show();
        }
    }

    private void showSavedPages() {
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        Set<String> stored = preferences.getStringSet(PREF_SAVED_PAGES, Collections.emptySet());
        if (stored == null || stored.isEmpty()) {
            Toast.makeText(this, R.string.saved_empty, Toast.LENGTH_SHORT).show();
            return;
        }

        List<String> entries = new ArrayList<>(stored);
        entries.sort((a, b) -> bookmarkTitle(a).compareToIgnoreCase(bookmarkTitle(b)));
        String[] labels = new String[entries.size()];
        for (int i = 0; i < entries.size(); i++) {
            labels[i] = bookmarkTitle(entries.get(i));
        }

        new AlertDialog.Builder(this)
                .setTitle(R.string.saved_title)
                .setItems(labels, (dialog, which) -> {
                    String url = bookmarkUrl(entries.get(which));
                    if (!url.isEmpty()) {
                        webView.loadUrl(url);
                    }
                })
                .setNeutralButton(R.string.clear_saved, (dialog, which) ->
                        preferences.edit().remove(PREF_SAVED_PAGES).apply()
                )
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void shareCurrentPage() {
        String url = webView.getUrl();
        if (url == null || url.trim().isEmpty()) {
            return;
        }
        String title = webView.getTitle();
        if (title == null || title.trim().isEmpty()) {
            title = "RightsRadar UK";
        }

        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
        shareIntent.putExtra(Intent.EXTRA_TEXT, title + "\n" + url);
        startActivity(Intent.createChooser(shareIntent, getString(R.string.share_page)));
    }

    private String findSavedEntryByUrl(Set<String> entries, String url) {
        for (String entry : entries) {
            if (url.equals(bookmarkUrl(entry))) {
                return entry;
            }
        }
        return null;
    }

    private String encodeBookmark(String title, String url) {
        return title.replace(BOOKMARK_SEPARATOR, " ") + BOOKMARK_SEPARATOR + url;
    }

    private String bookmarkTitle(String entry) {
        int separator = entry.indexOf(BOOKMARK_SEPARATOR);
        return separator < 0 ? entry : entry.substring(0, separator);
    }

    private String bookmarkUrl(String entry) {
        int separator = entry.indexOf(BOOKMARK_SEPARATOR);
        return separator < 0 ? "" : entry.substring(separator + BOOKMARK_SEPARATOR.length());
    }

    private void applySystemBarInsets(View root) {
        root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(
                        windowInsets.getSystemWindowInsetLeft(),
                        windowInsets.getSystemWindowInsetTop(),
                        windowInsets.getSystemWindowInsetRight(),
                        windowInsets.getSystemWindowInsetBottom()
                );
            }
            return windowInsets;
        });
        root.requestApplyInsets();
    }

    private boolean isInternal(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "https".equalsIgnoreCase(scheme)
                && host != null
                && APP_HOST.equals(host.toLowerCase(Locale.ROOT));
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) {
            return;
        }

        boolean allowed = "https".equalsIgnoreCase(scheme)
                || "http".equalsIgnoreCase(scheme)
                || "mailto".equalsIgnoreCase(scheme)
                || "tel".equalsIgnoreCase(scheme)
                || "sms".equalsIgnoreCase(scheme);

        if (!allowed) {
            return;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, "No app is available to open this link.", Toast.LENGTH_SHORT).show();
        }
    }

    private void showLoadError(String url) {
        retryUrl = url == null || url.trim().isEmpty() ? HOME_URL : url;
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void handleBack() {
        if (errorPanel.getVisibility() == View.VISIBLE) {
            errorPanel.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            return;
        }
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
        }
    }

    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.stopLoading();
        webView.setWebChromeClient(null);
        webView.setWebViewClient(null);
        webView.destroy();
        super.onDestroy();
    }

    private final class RightsRadarWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isInternal(uri)) {
                return false;
            }
            openExternal(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            errorPanel.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                showLoadError(request.getUrl().toString());
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
            if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                showLoadError(request.getUrl().toString());
            }
        }
    }
}
