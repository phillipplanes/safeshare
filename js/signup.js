document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  SS.initChrome();
  if (!SS.supabase) { return; }

  SS.getSession().then(function (session) {
    if (session) { location.href = 'dashboard.html'; }
  });

  var form = document.getElementById('signup-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var password2 = document.getElementById('password2').value;

    if (password !== password2) {
      SS.flash('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 8) {
      SS.flash('Password must be at least 8 characters.', 'error');
      return;
    }

    supabase.auth.signUp({ email: email, password: password }).then(function (res) {
      if (res.error) {
        SS.flash(res.error.message, 'error');
        return;
      }
      if (res.data.session) {
        // Email confirmation disabled in the project settings: logged in already.
        location.href = 'dashboard.html';
      } else {
        SS.flash('Account created! Check your email for the confirmation link, then log in.', 'ok');
        form.reset();
      }
    });
  });
});
