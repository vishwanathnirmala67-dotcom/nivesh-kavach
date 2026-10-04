(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (t) { return t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; };
  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    $('err').textContent = '';
    fetch('/api/admin/users', { headers: { 'X-Admin-Key': $('key').value } })
      .then(function (r) {
        if (r.status === 404) throw new Error('Owner view is not switched on (ADMIN_KEY missing on the server).');
        if (r.status === 401) throw new Error('Wrong key.');
        if (r.status === 429) throw new Error('Too many tries. Wait a few minutes.');
        if (!r.ok) throw new Error('Something went wrong.');
        return r.json();
      })
      .then(function (d) {
        $('sTotal').textContent = d.total; $('sNew').textContent = d.newToday; $('sChecks').textContent = d.totalChecks;
        var tb = $('rows'); tb.textContent = '';
        d.users.forEach(function (u, i) {
          var tr = document.createElement('tr');
          [i + 1, u.name, u.email, fmt(u.joined), u.checks, fmt(u.lastCheck)].forEach(function (v) {
            var td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
        $('out').hidden = false;
      })
      .catch(function (x) { $('out').hidden = true; $('err').textContent = x.message; });
  });
})();
