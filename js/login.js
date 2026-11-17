document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  SS.getSession().then(function (session) {
    if (session) { location.href = 'dashboard.html'; }
  });

  var form = document.getElementById('login-form');
  var resendForm = document.getElementById('resend-form');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;

    SS.supabase.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) {
        SS.flash(res.error.message, 'error');
        if (/email not confirmed/i.test(res.error.message)) {
          resendForm.style.display = 'block';
          document.getElementById('email').dataset.resend = email;
        }
        return;
      }
      location.href = 'dashboard.html';
    }).catch(function (err) {
      SS.flash(err.message || 'Network error — could not reach the server.', 'error');
    });
  });

  resendForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value.trim();
    SS.supabase.auth.resend({ type: 'signup', email: email }).then(function (res) {
      SS.flash(res.error ? res.error.message : 'Confirmation email sent — check your inbox.', res.error ? 'error' : 'ok');
    }).catch(function (err) {
      SS.flash(err.message || 'Network error — could not reach the server.', 'error');
    });
  });
});
