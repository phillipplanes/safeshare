document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  var id = new URLSearchParams(location.search).get('id');
  if (!id) {
    document.getElementById('content').innerHTML = '<p class="flash error">Missing share id.</p>';
    return;
  }

  SS.requireAuth(false).then(async function (session) {
    if (!session) { return; }

    var res = await supabase.from('shares').select('*').eq('id', id).maybeSingle();
    if (res.error) { SS.flash(res.error.message, 'error'); return; }
    var share = res.data;
    if (!share) {
      document.getElementById('content').innerHTML = '<p class="flash error">Share not found.</p>';
      return;
    }

    var url = SS.shareUrl(share.token);
    var released = share.status === 'active' && new Date(share.release_at) <= new Date();
    var badge = share.status === 'cancelled'
      ? '<span class="badge cancelled">cancelled</span>'
      : (released ? '<span class="badge released">released</span>' : '<span class="badge pending">waiting for release time</span>');

    var fieldNames = (share.fields || []).map(function (k) {
      var f = SS.fieldByKey(k);
      return f ? f.label : k;
    }).join(', ');

    document.getElementById('content').innerHTML =
      '<div class="card qr-card">' +
        '<div id="qr"></div>' +
        '<div>' +
          '<p><strong>Status:</strong> ' + badge + '</p>' +
          '<p><strong>Releases at:</strong> ' + SS.esc(SS.fmtDt(share.release_at)) + '</p>' +
          '<p><strong>Fields shared:</strong> ' + SS.esc(fieldNames) + '</p>' +
          (share.message ? '<p><strong>Message on release:</strong> ' + SS.esc(share.message) + '</p>' : '') +
          (share.status === 'cancelled' ? '<p><strong>Cancel message:</strong> ' + SS.esc(share.cancel_message || 'This share was cancelled by the sender.') + '</p>' : '') +
          '<p><strong>Public link:</strong> <code id="share-url">' + SS.esc(url) + '</code> ' +
            '<button class="btn tiny ghost" id="copy-link" type="button">copy</button> ' +
            '<a class="btn tiny ghost" href="' + SS.esc(url) + '" target="_blank" rel="noopener">open</a></p>' +
          '<p><a class="btn small ghost" id="download-qr" download="safeshare-share.png" href="#">Download QR (PNG)</a></p>' +
        '</div>' +
      '</div>';

    var canvas = SS.renderQR(document.getElementById('qr'), url);
    document.getElementById('copy-link').addEventListener('click', function () {
      SS.copyText(url, this);
    });
    document.getElementById('download-qr').addEventListener('click', function (e) {
      e.preventDefault();
      this.href = canvas.toDataURL('image/png');
    });

    if (share.status === 'active') {
      var cancelForm = document.getElementById('cancel-form');
      cancelForm.style.display = 'block';
      document.getElementById('cancel_message').value = share.cancel_message || 'Changed my mind — not sharing this after all.';
      cancelForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var msg = document.getElementById('cancel_message').value.trim();
        var upd = await supabase.from('shares').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_message: msg || null
        }).eq('id', share.id);
        if (upd.error) { SS.flash(upd.error.message, 'error'); return; }
        location.reload();
      });
      if (location.hash === '#cancel') {
        cancelForm.scrollIntoView();
      }
    }
  });
});
