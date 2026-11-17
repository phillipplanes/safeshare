/* SafeShare shared helpers. Requires the Supabase UMD bundle, assets/qrcode.js
   and js/config.js to be loaded first. */
(function () {
  'use strict';

  var cfg = window.SAFESHARE_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1 && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf('YOUR-') === -1);
  var supabase = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  var SS = {
    cfg: cfg,
    configured: configured,
    supabase: supabase,
    FIELDS: [
      { key: 'name',      label: 'Share name' },
      { key: 'email',     label: 'Email' },
      { key: 'phone',     label: 'Phone' },
      { key: 'address',   label: 'Address' },
      { key: 'twitter',   label: 'X / Twitter', prefix: 'https://x.com/' },
      { key: 'instagram', label: 'Instagram',   prefix: 'https://instagram.com/' },
      { key: 'facebook',  label: 'Facebook',    prefix: 'https://facebook.com/' },
      { key: 'linkedin',  label: 'LinkedIn',    prefix: 'https://linkedin.com/in/' },
      { key: 'tiktok',    label: 'TikTok',      prefix: 'https://tiktok.com/@' },
      { key: 'snapchat',  label: 'Snapchat',    prefix: 'https://snapchat.com/add/' },
      { key: 'youtube',   label: 'YouTube',     prefix: 'https://youtube.com/' },
      { key: 'github',    label: 'GitHub',      prefix: 'https://github.com/' },
      { key: 'website',   label: 'Website',     prefix: '' }
    ]
  };
  window.SS = SS;

  SS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  SS.siteBase = function () {
    var base = cfg.SITE_URL || (location.origin + location.pathname.replace(/[^/]*$/, ''));
    return base.replace(/\/?$/, '/');
  };

  SS.shareUrl = function (token) {
    return SS.siteBase() + 's.html?t=' + encodeURIComponent(token);
  };

  SS.fmtDt = function (iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  SS.flash = function (msg, type) {
    var el = document.getElementById('flash');
    if (!el) { return; }
    el.className = 'flash ' + (type || 'info');
    el.textContent = msg;
    el.style.display = 'block';
  };

  SS.fieldByKey = function (key) {
    return SS.FIELDS.find(function (f) { return f.key === key; });
  };

  // Raw value of a field in a profiles row ('' when empty).
  SS.profileValue = function (profile, key) {
    var f = SS.fieldByKey(key);
    if (!f || !profile) { return ''; }
    if (f.prefix === undefined) { return String(profile[key] || '').trim(); }
    var socials = profile.socials || {};
    return String(socials[key] || '').trim();
  };

  // { text, href } for rendering a shared value (socials become profile links).
  SS.fieldDisplay = function (key, value) {
    var f = SS.fieldByKey(key);
    if (value && /^https?:\/\//i.test(value)) {
      return { text: value, href: value };
    }
    if (f && f.prefix && value) {
      return { text: value, href: f.prefix + value.replace(/^@/, '') };
    }
    if (key === 'email' && value) { return { text: value, href: 'mailto:' + value }; }
    if (key === 'phone' && value) { return { text: value, href: 'tel:' + value.replace(/[^\d+]/g, '') }; }
    return { text: value, href: null };
  };

  SS.getSession = function () {
    return supabase.auth.getSession().then(function (r) { return r.data.session; });
  };

  // Redirects to login.html when there is no session. When requireVerified is
  // true, also bounces unconfirmed users back to the dashboard.
  SS.requireAuth = function (requireVerified) {
    return SS.getSession().then(function (session) {
      if (!session) { location.href = 'login.html'; return null; }
      if (requireVerified && !session.user.email_confirmed_at) {
        location.href = 'dashboard.html?unverified=1';
        return null;
      }
      return session;
    });
  };

  // Draw a QR code for `text` into `el`; returns the canvas (for PNG download).
  SS.renderQR = function (el, text) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount(), cell = 6, m = 4;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = (n + m * 2) * cell;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111111';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) { ctx.fillRect((c + m) * cell, (r + m) * cell, cell, cell); }
      }
    }
    el.innerHTML = '';
    el.appendChild(canvas);
    return canvas;
  };

  SS.copyText = function (text, btn) {
    var done = function () {
      if (btn) { var old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = old; }, 1500); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this link:', text); });
    } else {
      window.prompt('Copy this link:', text);
    }
  };

  // Header nav + logout + "not configured" banner, called on every page.
  SS.initChrome = function () {
    if (!configured) {
      var bar = document.createElement('div');
      bar.className = 'config-warning';
      bar.textContent = 'SafeShare is not configured yet: set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js (see README.md).';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'logout') {
        e.preventDefault();
        if (supabase) { supabase.auth.signOut().then(function () { location.href = 'index.html'; }); }
      }
    });
    if (!supabase) { return; }
    SS.getSession().then(function (session) {
      document.querySelectorAll('[data-guest]').forEach(function (el) { el.style.display = session ? 'none' : ''; });
      document.querySelectorAll('[data-auth]').forEach(function (el) { el.style.display = session ? '' : 'none'; });
    });
  };
})();
