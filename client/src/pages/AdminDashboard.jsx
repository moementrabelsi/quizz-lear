import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton, SecondaryButton } from '../components/Buttons.jsx';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [otpSearch, setOtpSearch] = useState('');
  const [otpSearchApplied, setOtpSearchApplied] = useState('');
  const [copiedOtpId, setCopiedOtpId] = useState(null);
  const [emailSearch, setEmailSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quizFilterId, setQuizFilterId] = useState('');
  const [colFilters, setColFilters] = useState({
    email: '',
    quiz: '',
    tryMin: '',
    tryMax: '',
    scoreMin: '',
    scoreMax: '',
    pctMin: '',
    pctMax: '',
  });
  const [sort, setSort] = useState({ key: 'submittedAt', dir: 'desc' });

  const quizzesQuery = useQuery({
    queryKey: ['adminQuizzes'],
    queryFn: async () => (await api.get('/api/admin/quizzes')).data,
  });

  const completionsQuery = useQuery({
    queryKey: ['adminCompletions', debouncedSearch, quizFilterId],
    queryFn: async () => {
      const params = {};
      if (debouncedSearch) params.email = debouncedSearch;
      if (quizFilterId) params.quizId = quizFilterId;
      return (await api.get('/api/admin/completions', { params })).data;
    },
  });

  const otpQuery = useQuery({
    queryKey: ['adminOtpCodes', otpSearchApplied],
    queryFn: async () => {
      const params = {};
      if (otpSearchApplied) params.email = otpSearchApplied;
      return (await api.get('/api/admin/otp-codes', { params })).data;
    },
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    materialPdfUrl: '',
    passingScore: 70,
    duration: 900,
    active: true,
  });
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    materialPdfUrl: '',
    passingScore: 70,
    duration: 900,
    active: false,
  });

  const createQuiz = useMutation({
    mutationFn: async () => api.post('/api/admin/quizzes', form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
      setForm({
        title: '',
        description: '',
        videoUrl: '',
        materialPdfUrl: '',
        passingScore: 70,
        duration: 900,
        active: true,
      });
    },
  });

  const patchQuiz = useMutation({
    mutationFn: async ({ id, body }) => api.patch(`/api/admin/quizzes/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
      setEditingQuizId(null);
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id) => api.delete(`/api/admin/quizzes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
      await queryClient.invalidateQueries({ queryKey: ['adminCompletions'] });
    },
  });

  function onSearchSubmit(e) {
    e.preventDefault();
    setDebouncedSearch(emailSearch.trim());
  }

  function onOtpSearchSubmit(e) {
    e.preventDefault();
    setOtpSearchApplied(otpSearch.trim());
  }

  async function copyOtpValue(id, code) {
    if (!code) return;
    await navigator.clipboard.writeText(String(code));
    setCopiedOtpId(String(id));
    window.setTimeout(() => setCopiedOtpId(null), 1200);
  }

  function startEditQuiz(q) {
    setEditingQuizId(q.id);
    setEditForm({
      title: q.title || '',
      description: q.description || '',
      videoUrl: q.videoUrl || '',
      materialPdfUrl: q.materialPdfUrl || '',
      passingScore: Number(q.passingScore ?? 70),
      duration: Number(q.duration ?? 900),
      active: Boolean(q.active),
    });
  }

  function cancelEditQuiz() {
    setEditingQuizId(null);
  }

  function submitEditQuiz(e) {
    e.preventDefault();
    if (!editingQuizId) return;
    patchQuiz.mutate({
      id: editingQuizId,
      body: {
        title: editForm.title.trim(),
        description: editForm.description,
        videoUrl: editForm.videoUrl.trim(),
        materialPdfUrl: editForm.materialPdfUrl.trim(),
        passingScore: Number(editForm.passingScore),
        duration: Number(editForm.duration),
        active: Boolean(editForm.active),
      },
    });
  }

  const toggleSort = useCallback((key) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'asc' };
      return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const tableRows = useMemo(() => {
    let rows = [...(completionsQuery.data?.completions || [])];
    const cf = colFilters;
    if (cf.email.trim()) {
      const q = cf.email.trim().toLowerCase();
      rows = rows.filter((r) => (r.email || '').toLowerCase().includes(q));
    }
    if (cf.quiz.trim()) {
      const q = cf.quiz.trim().toLowerCase();
      rows = rows.filter((r) => (r.quizTitle || '').toLowerCase().includes(q));
    }
    const tryMin = cf.tryMin === '' ? null : Number(cf.tryMin);
    const tryMax = cf.tryMax === '' ? null : Number(cf.tryMax);
    if (tryMin != null && !Number.isNaN(tryMin)) {
      rows = rows.filter((r) => (r.passedOnAttempt ?? 0) >= tryMin);
    }
    if (tryMax != null && !Number.isNaN(tryMax)) {
      rows = rows.filter((r) => (r.passedOnAttempt ?? 0) <= tryMax);
    }
    const scoreMin = cf.scoreMin === '' ? null : Number(cf.scoreMin);
    const scoreMax = cf.scoreMax === '' ? null : Number(cf.scoreMax);
    if (scoreMin != null && !Number.isNaN(scoreMin)) {
      rows = rows.filter((r) => (r.score ?? 0) >= scoreMin);
    }
    if (scoreMax != null && !Number.isNaN(scoreMax)) {
      rows = rows.filter((r) => (r.score ?? 0) <= scoreMax);
    }
    const pctMin = cf.pctMin === '' ? null : Number(cf.pctMin);
    const pctMax = cf.pctMax === '' ? null : Number(cf.pctMax);
    if (pctMin != null && !Number.isNaN(pctMin)) {
      rows = rows.filter((r) => (r.percentage ?? 0) >= pctMin);
    }
    if (pctMax != null && !Number.isNaN(pctMax)) {
      rows = rows.filter((r) => (r.percentage ?? 0) <= pctMax);
    }

    const mul = sort.dir === 'asc' ? 1 : -1;
    const key = sort.key;
    rows.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (key === 'submittedAt') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (typeof va === 'string') {
        va = (va || '').toLowerCase();
        vb = (vb || '').toLowerCase();
      } else {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return rows;
  }, [completionsQuery.data, colFilters, sort]);

  function sortIndicator(columnKey) {
    if (sort.key !== columnKey) return <span className="text-lear-border">↕</span>;
    return sort.dir === 'asc' ? <span className="text-lear-dark">↑</span> : <span className="text-lear-dark">↓</span>;
  }

  async function downloadCompletionsCsv() {
    const params = {};
    if (debouncedSearch) params.email = debouncedSearch;
    if (quizFilterId) params.quizId = quizFilterId;
    const res = await api.get('/api/admin/exports/completions.csv', {
      params,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'completions-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const quizzes = quizzesQuery.data?.quizzes || [];

  const filterInputClass =
    'w-full min-w-[4rem] rounded border border-lear-border px-2 py-1.5 text-xs font-normal normal-case text-lear-dark placeholder:text-lear-muted';

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Administrator" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 border-b border-lear-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-lear-dark">Training administration</h1>
            <p className="mt-1 text-sm text-lear-muted">
              Manage assessments, review completions, and export records.
            </p>
          </div>
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => queryClient.invalidateQueries()}>
              Refresh data
            </SecondaryButton>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center justify-center rounded border border-lear-border px-4 py-2 text-sm font-semibold hover:border-lear-dark"
            >
              Analytics
            </Link>
          </div>
        </div>

        <section className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lear-muted">
              Create quiz
            </h2>
            <form
              className="mt-4 space-y-3 border border-lear-border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                createQuiz.mutate();
              }}
            >
              <div>
                <label className="text-xs font-medium text-lear-muted">Title</label>
                <input
                  className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-lear-muted">Description</label>
                <textarea
                  className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-lear-muted">YouTube URL</label>
                <input
                  className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-lear-muted">
                  Reading material PDF (optional)
                </label>
                <input
                  className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                  value={form.materialPdfUrl}
                  onChange={(e) => setForm((f) => ({ ...f, materialPdfUrl: e.target.value }))}
                  placeholder="materials/handbook.pdf"
                />
                <p className="mt-1 text-xs text-lear-muted">
                  App path like <code className="text-lear-dark">materials/file.pdf</code> or{' '}
                  <code className="text-lear-dark">/materials/file.pdf</code>, or a full HTTPS URL.
                  File must live under <code className="text-lear-dark">client/public</code>. Leave
                  empty to skip the reading step.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-lear-muted">Passing %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    value={form.passingScore}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, passingScore: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-lear-muted">Timer (seconds)</label>
                  <input
                    type="number"
                    min={60}
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Set as active quiz (others will be deactivated)
              </label>
              {createQuiz.isError ? (
                <p className="text-sm text-lear-red">
                  {createQuiz.error?.response?.data?.message || 'Could not create quiz.'}
                </p>
              ) : null}
              <PrimaryButton type="submit" disabled={createQuiz.isPending}>
                {createQuiz.isPending ? 'Saving…' : 'Create quiz'}
              </PrimaryButton>
            </form>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lear-muted">
              Quizzes
            </h2>
            <div className="mt-4 divide-y divide-lear-border border border-lear-border">
              {quizzesQuery.isLoading ? (
                <p className="p-4 text-sm text-lear-muted">Loading…</p>
              ) : quizzes.length === 0 ? (
                <p className="p-4 text-sm text-lear-muted">No quizzes yet.</p>
              ) : (
                quizzes.map((q) => (
                  <div key={q.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-lear-dark">{q.title}</p>
                      <p className="text-xs text-lear-muted">
                        {q.questionCount} questions · {q.attemptCount} completions ·{' '}
                        {q.active ? (
                          <span className="font-medium text-lear-red">Active</span>
                        ) : (
                          'Inactive'
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton type="button" onClick={() => startEditQuiz(q)}>
                        Edit
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          patchQuiz.mutate({
                            id: q.id,
                            body: { active: !q.active },
                          })
                        }
                      >
                        {q.active ? 'Deactivate' : 'Activate'}
                      </SecondaryButton>
                      <Link
                        to={`/admin/quizzes/${q.id}/questions`}
                        className="inline-flex items-center justify-center rounded border border-lear-border px-3 py-1.5 text-xs font-semibold hover:border-lear-dark"
                      >
                        Questions
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this quiz and all related questions and attempts?'
                            )
                          ) {
                            deleteQuiz.mutate(q.id);
                          }
                        }}
                        className="rounded border border-lear-border px-3 py-1.5 text-xs font-semibold text-lear-red hover:border-lear-red"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {editingQuizId ? (
              <form
                className="mt-4 space-y-3 border border-lear-border p-4"
                onSubmit={submitEditQuiz}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-lear-muted">
                  Edit quiz
                </p>
                <div>
                  <label className="text-xs font-medium text-lear-muted">Title</label>
                  <input
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-lear-muted">Description</label>
                  <textarea
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    rows={2}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-lear-muted">YouTube URL</label>
                  <input
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    value={editForm.videoUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-lear-muted">
                    Reading material PDF (optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                    value={editForm.materialPdfUrl}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, materialPdfUrl: e.target.value }))
                    }
                    placeholder="materials/handbook.pdf"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-lear-muted">Passing %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                      value={editForm.passingScore}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, passingScore: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-lear-muted">Timer (seconds)</label>
                    <input
                      type="number"
                      min={60}
                      className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                      value={editForm.duration}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, duration: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  Keep this quiz active
                </label>
                {patchQuiz.isError ? (
                  <p className="text-sm text-lear-red">
                    {patchQuiz.error?.response?.data?.message || 'Could not update quiz.'}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <PrimaryButton type="submit" disabled={patchQuiz.isPending}>
                    {patchQuiz.isPending ? 'Saving…' : 'Save changes'}
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={cancelEditQuiz}>
                    Cancel
                  </SecondaryButton>
                </div>
              </form>
            ) : null}
          </div>
        </section>

        <section className="mt-14 border-t border-lear-border pt-10">
          <div className="mb-10 border border-lear-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-lear-muted">
                  User OTP lookup
                </h2>
                <p className="mt-1 text-xs text-lear-muted">
                  Admin support view to recover employee OTP codes.
                </p>
              </div>
              <form onSubmit={onOtpSearchSubmit} className="flex gap-2">
                <input
                  className="rounded border border-lear-border px-3 py-2 text-sm"
                  placeholder="Search user email"
                  value={otpSearch}
                  onChange={(e) => setOtpSearch(e.target.value)}
                  aria-label="Search OTP by email"
                />
                <SecondaryButton type="submit">Search</SecondaryButton>
              </form>
            </div>

            <div className="mt-4 overflow-x-auto border border-lear-border">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-lear-border bg-lear-surface text-xs uppercase text-lear-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">OTP code</th>
                    <th className="px-3 py-3 font-medium">Shown once</th>
                    <th className="px-3 py-3 font-medium">Created</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lear-border">
                  {otpQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-lear-muted">
                        Loading…
                      </td>
                    </tr>
                  ) : (otpQuery.data?.otps || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-lear-muted">
                        No OTP records match this search.
                      </td>
                    </tr>
                  ) : (
                    (otpQuery.data?.otps || []).map((row) => (
                      <tr key={String(row.id)}>
                        <td className="px-3 py-3">{row.email}</td>
                        <td className="px-3 py-3 font-mono tracking-wide text-lear-dark">
                          {row.otpCode || '—'}
                        </td>
                        <td className="px-3 py-3">{row.otpShown ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-3 text-lear-muted">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                        </td>
                        <td className="px-3 py-3">
                          <SecondaryButton
                            type="button"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => copyOtpValue(row.id, row.otpCode)}
                            disabled={!row.otpCode}
                          >
                            {copiedOtpId === String(row.id) ? 'Copied' : 'Copy'}
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-lear-muted">
                Successful completions
              </h2>
              <p className="mt-1 max-w-xl text-xs text-lear-muted">
                Passed employees only—one row per person per quiz.{' '}
                <span className="font-medium text-lear-dark">Succeeded on try</span> is the attempt
                number of their passing submission. Use column headers to sort and filters to narrow
                rows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SecondaryButton type="button" onClick={downloadCompletionsCsv}>
                Export completions CSV
              </SecondaryButton>
              <select
                className="rounded border border-lear-border bg-white px-3 py-2 text-sm text-lear-dark"
                value={quizFilterId}
                onChange={(e) => setQuizFilterId(e.target.value)}
                aria-label="Filter by quiz"
              >
                <option value="">All quizzes</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
              <form onSubmit={onSearchSubmit} className="flex gap-2">
                <input
                  className="rounded border border-lear-border px-3 py-2 text-sm"
                  placeholder="Server: email contains"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  aria-label="Search completions by email"
                />
                <SecondaryButton type="submit">Apply</SecondaryButton>
              </form>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-lear-border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-lear-border bg-lear-surface text-xs uppercase text-lear-muted">
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('email')}
                    >
                      Email {sortIndicator('email')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('quizTitle')}
                    >
                      Quiz {sortIndicator('quizTitle')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('passedOnAttempt')}
                    >
                      Succeeded on try {sortIndicator('passedOnAttempt')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('score')}
                    >
                      Score {sortIndicator('score')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('percentage')}
                    >
                      % {sortIndicator('percentage')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-lear-dark"
                      onClick={() => toggleSort('submittedAt')}
                    >
                      Passed at {sortIndicator('submittedAt')}
                    </button>
                  </th>
                </tr>
                <tr className="border-b border-lear-border bg-white">
                  <th className="px-3 py-2 align-top">
                    <input
                      type="text"
                      className={filterInputClass}
                      placeholder="Contains…"
                      value={colFilters.email}
                      onChange={(e) =>
                        setColFilters((f) => ({ ...f, email: e.target.value }))
                      }
                      aria-label="Filter email column"
                    />
                  </th>
                  <th className="px-3 py-2 align-top">
                    <input
                      type="text"
                      className={filterInputClass}
                      placeholder="Contains…"
                      value={colFilters.quiz}
                      onChange={(e) =>
                        setColFilters((f) => ({ ...f, quiz: e.target.value }))
                      }
                      aria-label="Filter quiz column"
                    />
                  </th>
                  <th className="px-3 py-2 align-top">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Min"
                        value={colFilters.tryMin}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, tryMin: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min={1}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Max"
                        value={colFilters.tryMax}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, tryMax: e.target.value }))
                        }
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2 align-top">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={0}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Min"
                        value={colFilters.scoreMin}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, scoreMin: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min={0}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Max"
                        value={colFilters.scoreMax}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, scoreMax: e.target.value }))
                        }
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2 align-top">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Min"
                        value={colFilters.pctMin}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, pctMin: e.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={`${filterInputClass} flex-1`}
                        placeholder="Max"
                        value={colFilters.pctMax}
                        onChange={(e) =>
                          setColFilters((f) => ({ ...f, pctMax: e.target.value }))
                        }
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2 align-top text-xs font-normal normal-case text-lear-muted">
                    —
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lear-border">
                {completionsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-lear-muted">
                      Loading…
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-lear-muted">
                      No successful completions match the current filters.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr key={`${row.email}-${String(row.quizId)}-${String(row.id)}`}>
                      <td className="px-3 py-3">{row.email}</td>
                      <td className="px-3 py-3">{row.quizTitle}</td>
                      <td className="px-3 py-3 font-medium text-lear-dark">
                        {row.passedOnAttempt ?? '—'}
                      </td>
                      <td className="px-3 py-3">{row.score}</td>
                      <td className="px-3 py-3">{row.percentage}</td>
                      <td className="px-3 py-3 text-lear-muted">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
