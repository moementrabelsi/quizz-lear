import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';

export default function AnalyticsPage() {
  const query = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => (await api.get('/api/admin/analytics/summary')).data,
  });

  const data = query.data;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Analytics" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between border-b border-lear-border pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-lear-dark">Quiz analytics</h1>
            <p className="mt-1 text-sm text-lear-muted">
              Completion trends across published assessments.
            </p>
          </div>
          <Link to="/admin" className="text-sm font-semibold text-lear-red hover:underline">
            Dashboard
          </Link>
        </div>

        {query.isLoading ? (
          <p className="mt-10 text-sm text-lear-muted">Loading analytics…</p>
        ) : query.isError ? (
          <p className="mt-10 text-sm text-lear-red">Unable to load analytics.</p>
        ) : (
          <>
            <section className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="border border-lear-border px-6 py-5">
                <p className="text-xs font-semibold uppercase text-lear-muted">Total attempts</p>
                <p className="mt-2 text-3xl font-bold text-lear-dark">{data.totalAttempts}</p>
              </div>
              <div className="border border-lear-border px-6 py-5">
                <p className="text-xs font-semibold uppercase text-lear-muted">
                  Overall pass rate
                </p>
                <p className="mt-2 text-3xl font-bold text-lear-dark">{data.passRateOverall}%</p>
              </div>
              <div className="border border-lear-border px-6 py-5">
                <p className="text-xs font-semibold uppercase text-lear-muted">
                  Average score
                </p>
                <p className="mt-2 text-3xl font-bold text-lear-dark">{data.avgPercentage}%</p>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase text-lear-muted">By quiz</h2>
              <div className="mt-4 overflow-x-auto border border-lear-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-lear-border bg-lear-surface text-xs uppercase text-lear-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Quiz</th>
                      <th className="px-4 py-3 font-medium">Attempts</th>
                      <th className="px-4 py-3 font-medium">Pass rate</th>
                      <th className="px-4 py-3 font-medium">Avg %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lear-border">
                    {(data.perQuiz || []).map((row) => (
                      <tr key={String(row.quizId)}>
                        <td className="px-4 py-3">{row.title}</td>
                        <td className="px-4 py-3">{row.attempts}</td>
                        <td className="px-4 py-3">{row.passRate}%</td>
                        <td className="px-4 py-3">{row.avgPercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
