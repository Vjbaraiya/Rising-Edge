/* ============================================================================
   WHDC front-end API helper.
   Wraps the /api endpoints via reApiFetch (from core.js). Every call resolves to
   the response `data`, or rejects — pages catch the rejection and fall back to
   their built-in demo data, so the pages work with OR without a live backend.
   ============================================================================ */
(function () {
  function loggedIn() {
    return typeof window.reGetToken === 'function' && !!window.reGetToken();
  }
  function pub(url, opts) {
    // public GET (no auth needed); still send token if present
    var f = loggedIn() && window.reApiFetch ? window.reApiFetch : window.fetch;
    return f(url, opts).then(function (r) {
      return r.json();
    });
  }
  function auth(url, opts) {
    if (!loggedIn() || !window.reApiFetch) return Promise.reject(new Error('not-authenticated'));
    return window.reApiFetch(url, opts).then(function (r) {
      return r.json();
    });
  }
  function unwrap(d) {
    if (!d || d.success !== true) throw new Error((d && d.error) || 'request-failed');
    return d.data;
  }

  window.WHDC = {
    loggedIn: loggedIn,

    categories: function () {
      return pub('/api/challenges/categories').then(unwrap);
    },
    current: function (category) {
      var url = '/api/challenges/current';
      if (category) url += '?category=' + encodeURIComponent(category);
      return pub(url).then(unwrap);
    },
    next: function (category) {
      var url = '/api/challenges/next';
      if (category) url += '?category=' + encodeURIComponent(category);
      return pub(url).then(unwrap);
    },
    challengeLeaderboard: function (id) {
      return pub('/api/challenges/' + encodeURIComponent(id) + '/leaderboard').then(unwrap);
    },
    allTimeLeaderboard: function () {
      return pub('/api/leaderboard').then(unwrap);
    },
    me: function () {
      return auth('/api/me/whdc').then(unwrap);
    },
    startAttempt: function (challengeId, practice) {
      return auth('/api/challenges/' + encodeURIComponent(challengeId) + '/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice: !!practice }),
      }).then(unwrap);
    },
    autosave: function (attemptId, questionId, response) {
      return auth('/api/attempts/' + encodeURIComponent(attemptId) + '/answers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: questionId, response: response }),
      }).then(unwrap);
    },
    submit: function (attemptId, answers) {
      return auth('/api/attempts/' + encodeURIComponent(attemptId) + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answers || [] }),
      }).then(unwrap);
    },
    result: function (attemptId) {
      return auth('/api/attempts/' + encodeURIComponent(attemptId) + '/result').then(unwrap);
    },
  };
})();
