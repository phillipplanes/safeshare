function toLocalInputValue(d) {
  'use strict';
  var p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  SS.requireAuth(true).then(async function (session) {
    if (!session) { return; }
    var user = session.user;

    var res = await SS.supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (res.error) { SS.flash(res.error.message, 'error'); return; }
    var profile = res.data;
    if (!profile) {
      SS.flash('Fill in your profile first.', 'error');
      location.href = 'profile.html';
      return;
    }

    // Default release: one hour from now.
    document.getElementById('release_at').value = toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));

    var box = document.getElementById('fields-box');
    SS.FIELDS.forEach(function (f) {
      var value = SS.profileValue(profile, f.key);
      var label = document.createElement('label');
      label.className = 'check';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.value = f.key;
      if (value) {
        input.checked = (f.key === 'name' || f.key === 'email' || f.key === 'phone');
        label.title = value;
      } else {
        input.disabled = true;
        label.title = 'Empty in your profile';
      }
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + f.label + (value ? ' (' + value + ')' : ' — empty in profile')));
      box.appendChild(label);
    });

    document.getElementById('share-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var fields = Array.prototype.slice.call(box.querySelectorAll('input:checked')).map(function (i) { return i.value; });
      if (!fields.length) {
        SS.flash('Select at least one field to share.', 'error');
        return;
      }
      var releaseLocal = document.getElementById('release_at').value;
      if (!releaseLocal) {
        SS.flash('Pick a release date and time.', 'error');
        return;
      }
      var releaseAt = new Date(releaseLocal).toISOString();
      if (isNaN(new Date(releaseAt).getTime())) {
        SS.flash('Invalid release date/time.', 'error');
        return;
      }

      var row = {
        user_id: user.id,
        fields: fields,
        release_at: releaseAt,
        message: document.getElementById('message').value.trim() || null,
        cancel_message: document.getElementById('cancel_message').value.trim() || null
      };
      var ins = await SS.supabase.from('shares').insert(row).select().single();
      if (ins.error) {
        SS.flash(ins.error.message, 'error');
        return;
      }
      location.href = 'share_view.html?id=' + ins.data.id;
    });
  });
});
