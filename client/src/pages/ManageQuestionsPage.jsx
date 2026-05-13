import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton, SecondaryButton } from '../components/Buttons.jsx';

export default function ManageQuestionsPage() {
  const { quizId } = useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    question: '',
    optionsText: '',
    correctAnswer: 0,
  });
  const [editingId, setEditingId] = useState(null);

  const questionsQuery = useQuery({
    queryKey: ['adminQuestions', quizId],
    queryFn: async () => (await api.get(`/api/admin/quizzes/${quizId}/questions`)).data,
    enabled: Boolean(quizId),
  });

  const createQ = useMutation({
    mutationFn: async () => {
      const lines = draft.optionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return api.post(`/api/admin/quizzes/${quizId}/questions`, {
        question: draft.question.trim(),
        options: lines,
        correctAnswer: Number(draft.correctAnswer),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuestions', quizId] });
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
      setDraft({ question: '', optionsText: '', correctAnswer: 0 });
    },
  });

  const deleteQ = useMutation({
    mutationFn: async (id) => api.delete(`/api/admin/questions/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuestions', quizId] });
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
    },
  });

  const updateQ = useMutation({
    mutationFn: async ({ id, body }) => api.patch(`/api/admin/questions/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminQuestions', quizId] });
      await queryClient.invalidateQueries({ queryKey: ['adminQuizzes'] });
      setEditingId(null);
      setDraft({ question: '', optionsText: '', correctAnswer: 0 });
    },
  });

  const questions = questionsQuery.data?.questions || [];

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Question bank" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4 border-b border-lear-border pb-6">
          <div>
            <h1 className="text-xl font-semibold text-lear-dark">Manage questions</h1>
            <p className="mt-1 text-sm text-lear-muted">Quiz ID: {quizId}</p>
          </div>
          <Link
            to="/admin"
            className="text-sm font-semibold text-lear-red hover:underline"
          >
            Back to dashboard
          </Link>
        </div>

        <section className="mt-8 border border-lear-border p-4">
          <h2 className="text-sm font-semibold uppercase text-lear-muted">
            {editingId ? 'Edit question' : 'Add question'}
          </h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const lines = draft.optionsText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              const body = {
                question: draft.question.trim(),
                options: lines,
                correctAnswer: Number(draft.correctAnswer),
              };
              if (editingId) {
                updateQ.mutate({ id: editingId, body });
              } else {
                createQ.mutate();
              }
            }}
          >
            <div>
              <label className="text-xs font-medium text-lear-muted">Prompt</label>
              <textarea
                required
                rows={2}
                className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-lear-muted">
                Options (one per line)
              </label>
              <textarea
                required
                rows={4}
                className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm font-mono"
                value={draft.optionsText}
                onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
                placeholder={'Option A\nOption B\nOption C'}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-lear-muted">
                Correct option index (0 = first line)
              </label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm"
                value={draft.correctAnswer}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, correctAnswer: Number(e.target.value) }))
                }
              />
            </div>
            {createQ.isError || updateQ.isError ? (
              <p className="text-sm text-lear-red">
                {createQ.error?.response?.data?.message ||
                  updateQ.error?.response?.data?.message ||
                  'Could not save question.'}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={createQ.isPending || updateQ.isPending}>
                {updateQ.isPending || createQ.isPending
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Add question'}
              </PrimaryButton>
              {editingId ? (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft({ question: '', optionsText: '', correctAnswer: 0 });
                  }}
                >
                  Cancel edit
                </SecondaryButton>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase text-lear-muted">Existing questions</h2>
          <div className="mt-4 divide-y divide-lear-border border border-lear-border">
            {questionsQuery.isLoading ? (
              <p className="p-4 text-sm text-lear-muted">Loading…</p>
            ) : questions.length === 0 ? (
              <p className="p-4 text-sm text-lear-muted">No questions yet.</p>
            ) : (
              questions.map((q, idx) => (
                <div key={q._id} className="p-4">
                  <p className="text-xs font-semibold text-lear-muted">Question {idx + 1}</p>
                  <p className="mt-1 font-medium text-lear-dark">{q.question}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-lear-muted">
                    {q.options.map((opt, i) => (
                      <li key={i} className={i === q.correctAnswer ? 'font-semibold text-lear-dark' : ''}>
                        {opt}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        setEditingId(q._id);
                        setDraft({
                          question: q.question,
                          optionsText: q.options.join('\n'),
                          correctAnswer: q.correctAnswer,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Edit
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this question?')) deleteQ.mutate(q._id);
                      }}
                    >
                      Delete
                    </SecondaryButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
