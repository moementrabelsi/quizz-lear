import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import VideoTrainingPage from './pages/VideoTrainingPage.jsx';
import MaterialTrainingPage from './pages/MaterialTrainingPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageQuestionsPage from './pages/ManageQuestionsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyOtpPage />} />

        <Route
          path="/training/video"
          element={
            <ProtectedRoute>
              <VideoTrainingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/material"
          element={
            <ProtectedRoute>
              <MaterialTrainingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/quiz"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/result"
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quizzes/:quizId/questions"
          element={
            <ProtectedRoute adminOnly>
              <ManageQuestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute adminOnly>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
