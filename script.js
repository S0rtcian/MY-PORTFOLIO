// Mobile sidebar toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const panel = document.querySelector('.sidebar-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Terminal typing effect — home page only, one orchestrated moment on load
  const typed = document.getElementById('typed');
  if (typed) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fullText = typed.dataset.text || '';
    if (reduceMotion) {
      typed.textContent = fullText;
    } else {
      let i = 0;
      typed.textContent = '';
      const type = () => {
        if (i <= fullText.length) {
          typed.textContent = fullText.slice(0, i);
          i++;
          setTimeout(type, 32);
        }
      };
      type();
    }
  }
});


// ============================================
// Cozy layer: stars, scroll-in meters, lo-fi player
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Build star ratings from data-rating
  document.querySelectorAll('.stars').forEach((el) => {
    const rating = Number(el.dataset.rating) || 0;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${rating} out of 5 stars`);
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i < rating ? ' on' : '');
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = '★';
      el.appendChild(s);
    }
  });

  // Animate meters + stars once, when they scroll into view
  const targets = document.querySelectorAll('.meter, .rating-list');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('in-view'));
  }

  // ============================================
  // Cozy audio player
  // - injected once per page (no HTML to copy-paste)
  // - hover (or keyboard focus) opens the controls
  // - starts on the visitor's first click/tap/keypress
  // - remembers position + volume while they browse
  // ============================================
  const AUDIO_SRC = 'mp3/Monoman - Meditation.mp3';  // path from each page
  const TRACK_TITLE = 'Meditation';
  const TRACK_ARTIST = 'Monoman';
  const AUTOPLAY_ON_FIRST_INTERACTION = true;        // set false for manual play only
  const DEFAULT_VOLUME = 0.4;
  const KEY = 'mic-vibe';

  if (!document.getElementById('vibe')) {
    document.body.insertAdjacentHTML('beforeend', `
<div class="vibe" id="vibe">
  <button class="vibe-toggle" id="vibeToggle" type="button" aria-expanded="false" aria-controls="vibePanel">
    <span aria-hidden="true">🎧</span><span class="vibe-label" id="vibeLabel">Play vibes</span>
  </button>
  <div class="vibe-panel" id="vibePanel" hidden>
    <div class="vibe-info">
      <div class="eq" id="eq" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <div>
        <p class="vibe-title">${TRACK_TITLE}</p>
        <p class="vibe-artist">${TRACK_ARTIST}</p>
      </div>
    </div>
    <div class="vibe-controls">
      <button class="vibe-play" id="vibePlay" type="button" aria-label="Play music">▶</button>
      <label class="vibe-vol">
        <span class="sr-only">Volume</span>
        <input type="range" id="vibeVol" min="0" max="1" step="0.05" value="${DEFAULT_VOLUME}">
      </label>
    </div>
    <p class="vibe-status" id="vibeStatus" role="status"></p>
    <audio id="vibeAudio" preload="none" loop src="${encodeURI(AUDIO_SRC)}"></audio>
  </div>
</div>`);
  }

  const vibe = document.getElementById('vibe');
  const toggle = document.getElementById('vibeToggle');
  const label = document.getElementById('vibeLabel');
  const panel = document.getElementById('vibePanel');
  const audio = document.getElementById('vibeAudio');
  const playBtn = document.getElementById('vibePlay');
  const vol = document.getElementById('vibeVol');
  const eq = document.getElementById('eq');
  const status = document.getElementById('vibeStatus');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---- saved state (sessionStorage = this visit only) ----
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) {}
  let userPaused = !!saved.userPaused;   // visitor chose silence: never auto-start again

  const save = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        playing: !audio.paused,
        time: audio.currentTime || 0,
        volume: audio.volume,
        userPaused
      }));
    } catch (e) {}
  };

  // ---- UI state ----
  const setPlaying = (on) => {
    playBtn.textContent = on ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    label.textContent = on ? 'Now vibing' : 'Play vibes';
    eq.classList.toggle('playing', on);
    vibe.classList.toggle('is-playing', on);
    if (canHover) toggle.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  // ---- volume ----
  const startVol = typeof saved.volume === 'number' ? saved.volume : DEFAULT_VOLUME;
  audio.volume = startVol;
  vol.value = startVol;

  // soft 1.5s fade-in so the music never jumps in
  let fadeId = 0;
  const fadeIn = (target) => {
    cancelAnimationFrame(fadeId);
    const t0 = performance.now();
    audio.volume = 0;
    const step = (now) => {
      const p = Math.min((now - t0) / 1500, 1);
      audio.volume = target * p;
      if (p < 1) fadeId = requestAnimationFrame(step);
    };
    fadeId = requestAnimationFrame(step);
  };

  // ---- play / pause ----
  const play = async ({ fade = false } = {}) => {
    try {
      await audio.play();
      if (fade) fadeIn(Number(vol.value));
      setPlaying(true);
      vibe.classList.remove('needs-tap');
      status.textContent = '';
      save();
      return true;
    } catch (err) {
      // NotAllowedError = autoplay blocked; anything else = missing/bad file
      if (err && err.name === 'NotAllowedError') {
        vibe.classList.add('needs-tap');
      } else {
        status.textContent = 'Could not play. Check that the mp3 path is right.';
        setOpen(true);
      }
      return false;
    }
  };

  const pause = () => {
    cancelAnimationFrame(fadeId);
    audio.volume = Number(vol.value);
    audio.pause();
    setPlaying(false);
    save();
  };

  const userToggle = async () => {
    if (audio.paused) {
      userPaused = false;
      await play({ fade: true });
    } else {
      userPaused = true;
      pause();
    }
  };

  // ---- restore position on the next page ----
  if (saved.time > 0 || saved.playing) {
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => {
      if (saved.time > 0 && saved.time < audio.duration) audio.currentTime = saved.time;
    }, { once: true });
  }

  // ---- autoplay, the polite way ----
  // Browsers only allow sound after a real user gesture. We try once on load
  // (works if they already interacted with the site), and if blocked we wait
  // for their first click / tap / key press anywhere on the page.
  const wantsAutoplay = !userPaused && (saved.playing || (AUTOPLAY_ON_FIRST_INTERACTION && saved.playing === undefined));
  const GESTURES = ['pointerdown', 'keydown', 'touchend'];

  const armFirstGesture = () => {
    const onGesture = async (e) => {
      if (vibe.contains(e.target)) return;            // they're using the player itself
      if (e.type === 'keydown' && ['Tab', 'Shift', 'Escape'].includes(e.key)) return; // not valid activations
      if (await play({ fade: true })) {
        GESTURES.forEach((g) => document.removeEventListener(g, onGesture, true));
      }
    };
    GESTURES.forEach((g) => document.addEventListener(g, onGesture, true));
  };

  if (wantsAutoplay) {
    play().then((ok) => { if (!ok) armFirstGesture(); });
  }

  // ---- hover / focus / click wiring ----
  let closeTimer;
  if (canHover) {
    vibe.addEventListener('mouseenter', () => { clearTimeout(closeTimer); setOpen(true); });
    vibe.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => setOpen(false), 350); });
  }
  vibe.addEventListener('focusin', () => { clearTimeout(closeTimer); setOpen(true); });
  vibe.addEventListener('focusout', (e) => {
    if (!vibe.contains(e.relatedTarget)) closeTimer = setTimeout(() => setOpen(false), 150);
  });

  // Mouse: the pill itself plays/pauses. Touch: the pill opens/closes the panel.
  toggle.addEventListener('click', () => { canHover ? userToggle() : setOpen(panel.hidden); });
  playBtn.addEventListener('click', userToggle);

  vol.addEventListener('input', () => {
    cancelAnimationFrame(fadeId);
    audio.volume = Number(vol.value);
    save();
  });

  // save position about once a second, and right before leaving the page
  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSave > 1000) { lastSave = now; save(); }
  });
  window.addEventListener('pagehide', save);

  audio.addEventListener('error', () => {
    setPlaying(false);
    status.textContent = 'Audio file not found. Check the path to your mp3.';
    setOpen(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
});
