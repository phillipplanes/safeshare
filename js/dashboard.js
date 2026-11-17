document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  SS.requireAuth(false).then(async function (session) {
    if (!session) { return; }
    var user = session.user;

    if (!user.email_confirmed_at || new URLSearchParams(location.search).get('unverified')) {
      document.getElementById('verify-banner').style.display = 'block';
    }
    document.getElementById('resend-verify').addEventListener('click', function () {
      supabase.auth.resend({ type: 'signup', email: user.email }).then(function (res) {
        SS.flash(res.error ? res.error.message : 'Confirmation email sent — check your inbox.', res.error ? 'error' : 'ok');
      });
    });

    var profile = null;
    var pRes = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (!pRes.error) { profile = pRes.data; }

    if (profile) {
      var filled = SS.FIELDS.filter(function (f) { return SS.profileValue(profile, f.key); }).length;
      document.getElementById('profile-summary').textContent =
        filled + ' of ' + SS.FIELDS.length + ' fields filled in.';
    } else {
      document.getElementById('profile-summary').textContent = 'Your profile is empty — fill it in so you have something to share.';
    }

    var res = await supabase.from('shares').select('*').order('created_at', { ascending: false });
    if (res.error) {
      document.getElementById('shares-list').innerHTML = '<p class="flash error">' + SS.esc(res.error.message) + '</p>';
      return;
    }
    var shares = res.data || [];
    var container = document.getElementById('shares-list');
    if (!shares.length) {
      container.innerHTML = '<p class="muted">No shares yet. Create your first timed share.</p>';
      return;
    }

    var html = '<table class="table"><thead><tr>' +
      '<th>Created</th><th>Releases at</th><th>Status</th><th>Fields</th><th>Link</th><th></th>' +
      '</tr></thead><tbody>';
    shares.forEach(function (s) {
      var badge = s.status === 'cancelled'
        ? '<span class="badge cancelled">cancelled</span>'
        : (new Date(s.release_at) > new Date()
          ? '<span class="badge pending">waiting</span>'
          : '<span class="badge released">released</span>');
      var url = SS.shareUrl(s.token);
      html += '<tr>' +
        '<td>' + SS.esc(SS.fmtDt(s.created_at)) + '</td>' +
        '<td>' + SS.esc(SS.fmtDt(s.release_at)) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' + (s.fields || []).length + '</td>' +
        '<td><code>' + SS.esc(url.replace(/^https?:\/\//, '')) + '</code> ' +
          '<button class="btn tiny ghost" data-copy="' + SS.esc(url) + '">copy</button></td>' +
        '<td><a class="btn tiny" href="share_view.html?id=' + s.id + '">QR / details</a> ' +
          (s.status === 'active' ? '<a class="btn tiny danger" href="share_view.html?id=' + s.id + '#cancel">cancel</a>' : '') +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () { SS.copyText(btn.getAttribute('data-copy'), btn); });
    });
  });
});
