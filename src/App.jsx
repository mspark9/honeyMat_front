import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LandingPage from './pages/LandingPage';
import HomePage from './components/home/HomePage';
import DailyLogPage from './pages/DailyLogPage';
import ReportPage from './components/Report/ReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ScanAnalysisPage from './components/scanAnalysis/ScanAnalysisPage';
import RecommendPage from './components/Recommend/RecommendPage';
import Setting from './components/setting/Setting';
import Alert from './components/alert/Alert';

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* 랜딩 페이지 (첫 진입) */}
              <Route path="/" element={<LandingPage />} />

              {/* 인증 페이지 (Layout 없이 전체 화면) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* 메인 앱 (Layout 포함) */}
              <Route path="/home" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="recommendation" element={<RecommendPage />} />
                <Route path="scanAnalysis" element={<ScanAnalysisPage />} />
                <Route path="dailyLog" element={<DailyLogPage />} />
                <Route path="report" element={<ReportPage />} />
                <Route path="notifications" element={<Alert />} />
                <Route path="settings" element={<Setting />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;
