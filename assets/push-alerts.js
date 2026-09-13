(() => {
  if (!/\/alerts\.html$/.test(location.pathname)) return;

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function base64UrlToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
  }

  function selectedTopics() {
    return [...document.querySelectorAll('#lawAlertSignup input[name="topics"]:checked')].map(input => input.value);
  }

  function selectedJurisdiction() {
    return document.querySelector('#alertJurisdiction')?.value || 'uk-wide';
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function buildPanel() {
    const layout = document.querySelector('.alerts-layout');
    if (!layout || document.querySelector('#rrPushPanel')) return;

    const panel = document.createElement('section');
    panel.id = 'rrPushPanel';
    panel.className = 'alerts-panel';
    panel.style.gridColumn = '1 / -1';
    panel.innerHTML = `
      <div style="display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
        <div style="max-width:680px">
          <span class="coming">PWA PHONE ALERTS</span>
          <h2 style="margin:12px 0 8px">Get law-change notifications on this device</h2>
          <p style="margin:0;color:#aebbd0">No email is required for phone notifications. Your browser creates a private push endpoint and RightsRadar stores only that endpoint, your jurisdiction and the topics you choose.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="rrEnablePush" type="button">Enable phone alerts</button>
          <button class="btn btn-secondary" id="rrDisablePush" type="button" style="display:none">Disable</button>
        </div>
      </div>
      <div id="rrPushStatus" class="form-status" role="status" aria-live="polite" style="display:block;margin-top:14px">Checking phone notification support…</div>`;
    layout.prepend(panel);

    const enable = panel.querySelector('#rrEnablePush');
    const disable = panel.querySelector('#rrDisablePush');
    const status = panel.querySelector('#rrPushStatus');

    const setStatus = (message, error = false) => {
      status.textContent = message;
      status.className = 'form-status' + (error ? ' error' : '');
      status.style.display = 'block';
    };

    async function currentSubscription() {
      if (!supported) return null;
      const registration = await navigator.serviceWorker.ready;
      return registration.pushManager.getSubscription();
    }

    async function refresh() {
      if (!supported) {
        enable.disabled = true;
        setStatus('This browser does not support web push notifications. You can still use email Law Alerts when delivery is enabled.', true);
        return;
      }
      try {
        const config = await api('/api/push');
        if (!config.enabled) {
          enable.disabled = true;
          setStatus('Phone alerts are built into the PWA, but the secure notification key still needs to be enabled on the server.');
          return;
        }
        const subscription = await currentSubscription();
        if (subscription) {
          enable.textContent = 'Update phone alert topics';
          disable.style.display = 'inline-flex';
          setStatus('Phone notifications are enabled on this device.');
        } else if (Notification.permission === 'denied') {
          enable.disabled = true;
          setStatus('Notifications are blocked in this browser. Change the site notification permission in your browser settings to enable them.', true);
        } else {
          setStatus('Phone alerts are available. RightsRadar will ask for notification permission only after you tap Enable.');
        }
      } catch (error) {
        enable.disabled = true;
        setStatus(error.message || 'Phone alerts are temporarily unavailable.', true);
      }
    }

    enable.addEventListener('click', async () => {
      enable.disabled = true;
      try {
        const topics = selectedTopics();
        if (!topics.length) throw new Error('Choose at least one topic below first.');
        const config = await api('/api/push');
        if (!config.enabled || !config.publicKey) throw new Error('Phone alerts are not enabled on the server yet.');
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Notification permission was not granted.');

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(config.publicKey)
          });
        }

        await api('/api/push', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            subscription: subscription.toJSON(),
            jurisdiction: selectedJurisdiction(),
            topics,
            consent: true
          })
        });
        enable.textContent = 'Update phone alert topics';
        disable.style.display = 'inline-flex';
        setStatus('Phone alerts are enabled. A confirmation notification should appear on this device.');
      } catch (error) {
        setStatus(error.message || 'Unable to enable phone alerts.', true);
      } finally {
        enable.disabled = false;
      }
    });

    disable.addEventListener('click', async () => {
      disable.disabled = true;
      try {
        const subscription = await currentSubscription();
        if (subscription) {
          await api('/api/push', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'unsubscribe', subscription: subscription.toJSON() })
          }).catch(() => {});
          await subscription.unsubscribe();
        }
        enable.textContent = 'Enable phone alerts';
        disable.style.display = 'none';
        setStatus('Phone alerts are disabled on this device.');
      } catch (error) {
        setStatus(error.message || 'Unable to disable phone alerts.', true);
      } finally {
        disable.disabled = false;
      }
    });

    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
  else buildPanel();
})();
