document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  // Build one input per social field.
  var socialsBox = document.getElementById('socials-inputs');
  SS.FIELDS.filter(function (f) { return f.prefix !== undefined; }).forEach(function (f) {
    var label = document.createElement('label');
    label.textContent = f.label;
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'social_' + f.key;
    input.maxLength = 255;
    input.placeholder = f.prefix ? f.prefix + 'username' : 'https://…';
    label.appendChild(input);
    socialsBox.appendChild(label);
  });

  SS.requireAuth(false).then(async function (session) {
    if (!session) { return; }
    var user = session.user;

    var res = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (res.error) { SS.flash(res.error.message, 'error'); return; }
    var profile = res.data || {};

    document.getElementById('share_name').value = profile.share_name || '';
    document.getElementById('email').value = profile.email || user.email || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('address').value = profile.address || '';
    var socials = profile.socials || {};
    Object.keys(socials).forEach(function (k) {
      var el = document.getElementById('social_' + k);
      if (el) { el.value = socials[k]; }
    });

    document.getElementById('profile-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var newSocials = {};
      SS.FIELDS.filter(function (f) { return f.prefix !== undefined; }).forEach(function (f) {
        var v = document.getElementById('social_' + f.key).value.trim();
        if (v) { newSocials[f.key] = v; }
      });
      var row = {
        user_id: user.id,
        share_name: document.getElementById('share_name').value.trim() || null,
        email: document.getElementById('email').value.trim() || null,
        phone: document.getElementById('phone').value.trim() || null,
        address: document.getElementById('address').value.trim() || null,
        socials: newSocials,
        updated_at: new Date().toISOString()
      };
      var up = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
      if (up.error) { SS.flash(up.error.message, 'error'); return; }
      SS.flash('Profile saved.', 'ok');
    });
  });
});
