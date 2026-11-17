document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  var result = document.getElementById('result');
  var token = new URLSearchParams(location.search).get('t');
  if (!token) {
    result.innerHTML = '<div class="card"><h1>Invalid link</h1><p>This share link is missing its code.</p></div>';
    return;
  }

  function render(data) {
    if (!data) {
      result.innerHTML = '<div class="card"><h1>Link not found</h1><p>This share does not exist (or was removed).</p></div>';
      return;
    }
    if (data.status === 'cancelled') {
      result.innerHTML = '<div class="card cancelled-card"><h1>Share cancelled</h1><p>' +
        SS.esc(data.cancel_message || 'This share was cancelled by the sender.') + '</p></div>';
      return;
    }
    if (data.status === 'pending') {
      var target = new Date(data.release_at).getTime();
      result.innerHTML = '<div class="card pending-card"><h1>Info is locked</h1>' +
        '<p>The sender will release this information at <strong>' + SS.esc(SS.fmtDt(data.release_at)) + '</strong>.</p>' +
        '<p class="countdown">Revealed in <span id="countdown">…</span></p>' +
        '<p class="muted">This page refreshes automatically.</p></div>';
      var tick = function () {
        var remain = target - Date.now();
        if (remain <= 0) { location.reload(); return; }
        var d = Math.floor(remain / 86400000);
        var h = Math.floor(remain % 86400000 / 3600000);
        var m = Math.floor(remain % 3600000 / 60000);
        var s = Math.floor(remain % 60000 / 1000);
        var el = document.getElementById('countdown');
        if (el) { el.textContent = (d ? d + 'd ' : '') + h + 'h ' + m + 'm ' + s + 's'; }
      };
      tick();
      setInterval(tick, 1000);
      setInterval(function () {
        if (Date.now() >= target) { location.reload(); }
      }, 15000);
      return;
    }
    // released
    var rows = (data.items || []).map(function (item) {
      var f = SS.fieldByKey(item.key);
      var label = f ? f.label : item.key;
      var disp = SS.fieldDisplay(item.key, item.value);
      var valueHtml = disp.href
        ? '<a href="' + SS.esc(disp.href) + '" target="_blank" rel="noopener">' + SS.esc(disp.text) + '</a>'
        : SS.esc(disp.text);
      return '<tr><th>' + SS.esc(label) + '</th><td>' + valueHtml + '</td></tr>';
    }).join('');
    result.innerHTML = '<div class="card released-card"><h1>Shared information</h1>' +
      (rows ? '<table class="table info-table"><tbody>' + rows + '</tbody></table>' : '<p>No fields were shared.</p>') +
      (data.message ? '<blockquote class="message">' + SS.esc(data.message) + '</blockquote>' : '') +
      '</div>';
  }

  supabase.rpc('get_public_share', { p_token: token }).then(function (res) {
    if (res.error) {
      result.innerHTML = '<div class="card"><h1>Something went wrong</h1><p>' + SS.esc(res.error.message) + '</p></div>';
      return;
    }
    render(res.data);
  });
});
