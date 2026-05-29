/**
 * Local-only progress tracker.
 *
 * Stores everything in the user's own browser (localStorage). No network,
 * no account, no server. Data never leaves the device.
 *
 * Schema (versioned so we can migrate later without nuking users):
 *
 *   aifs:progress:v1 = {
 *     lessons: {
 *       "<lesson-path>": {
 *         answers: { "<qid>": { picked: number, correct: boolean, t: number } },
 *         completedAt: number | null,
 *         visitedAt: number
 *       }
 *     },
 *     updatedAt: number
 *   }
 *
 * "<lesson-path>" matches the path used in lesson.html?path=... and in
 * data.js urls (e.g. "phases/00-setup-and-tooling/01-dev-environment").
 *
 * "<qid>" is "<stage>-q<index>" e.g. "pre-q0", to match the quiz renderer.
 */
(function () {
  var STORAGE_KEY = 'aifs:progress:v1';
  var listeners = [];
  var cloudUserId = null;

  function getSupabaseClient() {
    return (window.AIFSAuth && window.AIFSAuth.getClient) ? window.AIFSAuth.getClient() : null;
  }

  // Pull all rows for this user from Supabase and merge into localStorage.
  // Cloud wins for completedAt if local doesn't have it; local wins otherwise.
  // After merge, push any locally-completed lessons the cloud is missing.
  function syncFromCloud(userId) {
    cloudUserId = userId;
    var sb = getSupabaseClient();
    if (!sb) return;

    sb.from('progress').select('*').eq('user_id', userId).then(function (result) {
      if (result.error) { console.error('[AIFS] syncFromCloud error:', result.error); return; }
      var rows = result.data || [];
      var state = read();
      var cloudPaths = {};

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var path = row.lesson_path;
        cloudPaths[path] = true;
        if (!state.lessons[path]) {
          state.lessons[path] = { answers: {}, completedAt: null, visitedAt: 0 };
        }
        var local = state.lessons[path];
        if (row.completed_at && !local.completedAt) {
          local.completedAt = row.completed_at;
        }
        if ((row.visited_at || 0) > (local.visitedAt || 0)) {
          local.visitedAt = row.visited_at || 0;
        }
        var cloudAnswers = row.answers || {};
        if (typeof cloudAnswers === 'string') {
          try { cloudAnswers = JSON.parse(cloudAnswers); } catch (_) { cloudAnswers = {}; }
        }
        for (var qid in cloudAnswers) {
          if (!local.answers[qid]) local.answers[qid] = cloudAnswers[qid];
        }
      }

      // Persist merged state and notify UI.
      write(state);

      // Push local completions that the cloud doesn't know about.
      for (var localPath in state.lessons) {
        if (!cloudPaths[localPath] && state.lessons[localPath].completedAt) {
          pushRowToCloud(localPath, state.lessons[localPath]);
        }
      }
    });
  }

  function pushRowToCloud(path, lessonData) {
    if (!cloudUserId) return;
    var sb = getSupabaseClient();
    if (!sb) return;
    sb.from('progress').upsert({
      user_id: cloudUserId,
      lesson_path: path,
      completed_at: lessonData.completedAt || null,
      visited_at: lessonData.visitedAt || 0,
      answers: lessonData.answers || {}
    }, { onConflict: 'user_id,lesson_path' }).then(function (r) {
      if (r.error) console.error('[AIFS] pushRowToCloud error:', r.error);
    });
  }

  function deleteRowFromCloud(path) {
    if (!cloudUserId) return;
    var sb = getSupabaseClient();
    if (!sb) return;
    sb.from('progress').upsert({
      user_id: cloudUserId,
      lesson_path: path,
      completed_at: null,
      visited_at: 0,
      answers: {}
    }, { onConflict: 'user_id,lesson_path' }).then(function (r) {
      if (r.error) console.error('[AIFS] deleteRowFromCloud error:', r.error);
    });
  }

  function clearCloudData() {
    if (!cloudUserId) return;
    var sb = getSupabaseClient();
    if (!sb) return;
    sb.from('progress').delete().eq('user_id', cloudUserId).then(function (r) {
      if (r.error) console.error('[AIFS] clearCloudData error:', r.error);
    });
  }

  function clearCloudUser() {
    cloudUserId = null;
  }

  function emptyState() {
    return { lessons: {}, updatedAt: 0 };
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.lessons) return emptyState();
      return parsed;
    } catch (e) {
      return emptyState();
    }
  }

  function write(state) {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // quota or disabled storage; fail silently
    }
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (_) {}
    }
  }

  function ensureLesson(state, path) {
    if (!state.lessons[path]) {
      state.lessons[path] = { answers: {}, completedAt: null, visitedAt: 0 };
    }
    return state.lessons[path];
  }

  function recordVisit(path) {
    if (!path) return;
    var state = read();
    var lesson = ensureLesson(state, path);
    lesson.visitedAt = Date.now();
    write(state);
  }

  function recordAnswer(path, qid, picked, correct) {
    if (!path || !qid) return;
    var state = read();
    var lesson = ensureLesson(state, path);
    lesson.answers[qid] = { picked: picked, correct: !!correct, t: Date.now() };
    write(state);
  }

  function markLessonComplete(path) {
    if (!path) return;
    var state = read();
    var lesson = ensureLesson(state, path);
    if (!lesson.completedAt) {
      lesson.completedAt = Date.now();
      write(state);
      pushRowToCloud(path, lesson);
    }
  }

  function unmarkLessonComplete(path) {
    if (!path) return;
    var state = read();
    if (state.lessons[path] && state.lessons[path].completedAt) {
      state.lessons[path].completedAt = null;
      write(state);
      deleteRowFromCloud(path);
    }
  }

  function getLessonProgress(path) {
    if (!path) return null;
    var state = read();
    return state.lessons[path] || { answers: {}, completedAt: null, visitedAt: 0 };
  }

  function isLessonComplete(path) {
    var lp = getLessonProgress(path);
    return !!(lp && lp.completedAt);
  }

  /**
   * Given a list of lesson urls (full GitHub urls from data.js), count how
   * many the user has completed. Match by the trailing "phases/.../..." path.
   */
  function countCompletedFromUrls(urls) {
    var state = read();
    var n = 0;
    for (var i = 0; i < urls.length; i++) {
      var path = extractPath(urls[i]);
      if (path && state.lessons[path] && state.lessons[path].completedAt) n++;
    }
    return n;
  }

  function extractPath(url) {
    if (!url) return '';
    var m = String(url).match(/(phases\/[^/]+\/[^/]+)\/?/);
    return m ? m[1] : '';
  }

  function totalCompleted() {
    var state = read();
    var n = 0;
    for (var k in state.lessons) {
      if (state.lessons[k].completedAt) n++;
    }
    return n;
  }

  function reset() {
    clearCloudData();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](emptyState()); } catch (_) {}
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  // Cross-tab sync: if user clears or updates progress in another tab,
  // refresh listeners here too.
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    var state = read();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (_) {}
    }
  });

  window.AIFSProgress = {
    recordVisit: recordVisit,
    recordAnswer: recordAnswer,
    markLessonComplete: markLessonComplete,
    unmarkLessonComplete: unmarkLessonComplete,
    getLessonProgress: getLessonProgress,
    isLessonComplete: isLessonComplete,
    countCompletedFromUrls: countCompletedFromUrls,
    extractPath: extractPath,
    totalCompleted: totalCompleted,
    reset: reset,
    onChange: onChange,
    syncFromCloud: syncFromCloud,
    clearCloudUser: clearCloudUser,
  };
})();
