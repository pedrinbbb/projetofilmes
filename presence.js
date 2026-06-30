/* GOATCINE user presence heartbeat */
(function initGoatcinePresence() {
  const HEARTBEAT_INTERVAL_MS = 30000;
  let timerId = null;

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function getActivity() {
    const overlay = document.getElementById('player-overlay');
    const video = document.getElementById('video-element');
    const playerOpen = overlay?.classList.contains('show');
    const nativeVideoVisible = video && video.style.display !== 'none';

    if (playerOpen && nativeVideoVisible && !video.paused) {
      return 'watching';
    }

    return 'browsing';
  }

  async function sendHeartbeat() {
    const token = localStorage.getItem('goatcine_token');
    if (!token || document.visibilityState === 'hidden') return;

    const profile = readJson('goatcine_profile');

    try {
      await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profileId: profile?.id || null,
          profileName: profile?.name || null,
          activity: getActivity(),
          path: window.location.pathname
        })
      });
    } catch {
      // Presence is best-effort and should never interrupt the app.
    }
  }

  function start() {
    if (timerId) return;
    sendHeartbeat();
    timerId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
