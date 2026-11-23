import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";

// Route-level code splitting with React.lazy for optimized Core Web Vitals
const HomePage = lazy(() => import("./pages/HomePage"));
const PersonalizePage = lazy(() => import("./pages/PersonalizePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const StoryBooksPage = lazy(() => import("./pages/StoryBooksPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FootStepsPage = lazy(() => import("./pages/FootStepsPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const KuttysStoryPage = lazy(() => import("./pages/KuttysStoryPage"));

export default function App() {
  return (
    <BrowserRouter>
      {/* Universal ScrollToTop for all route navigations and redirects */}
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-[#C98A84] font-medium animate-pulse">
            Loading...
          </div>
        }
      >
        <Routes>
          {/* Admin Authentication & Login */}
          <Route path="/admin_login" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Dedicated Admin Dashboard */}
          <Route path="/admin_dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/stories" element={<AdminDashboardPage initialTab="stories" />} />
          <Route path="/admin/orders" element={<AdminDashboardPage initialTab="orders" />} />
          <Route path="/admin/payments" element={<AdminDashboardPage initialTab="payments" />} />
          <Route path="/admin/previews" element={<AdminDashboardPage initialTab="previews" />} />
          <Route path="/admin/page_editor" element={<AdminDashboardPage initialTab="page_editor" />} />
          <Route path="/admin/feedback" element={<AdminDashboardPage initialTab="feedback" />} />
          <Route path="/admin/feedbacks" element={<AdminDashboardPage initialTab="feedback" />} />
          <Route path="/admin/settings" element={<AdminDashboardPage initialTab="settings" />} />
          <Route path="/admin/kuttys-story" element={<AdminDashboardPage initialTab="kuttys_story" />} />

          {/* Customer storefront with header & footer layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="home" element={<HomePage />} />
            <Route path="storybooks" element={<StoryBooksPage />} />
            <Route path="stories" element={<StoryBooksPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="kuttys-story" element={<KuttysStoryPage />} />
            <Route path="kuttysstory" element={<KuttysStoryPage />} />
            <Route path="footsteps" element={<FootStepsPage />} />
            <Route path="foot-steps" element={<FootStepsPage />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="personalize" element={<PersonalizePage />} />
            <Route path="personalize/:slug" element={<PersonalizePage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="terms-and-conditions" element={<TermsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
