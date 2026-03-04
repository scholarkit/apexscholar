/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Resources from './pages/Resources';
import Insights from './pages/Insights';
import Analytics from './pages/Analytics';
import Login from './components/Login';
import { puterService } from './lib/puter';
import Explore from './pages/Explore';
import Kanban from './pages/Kanban';
import Funding from './pages/Funding';
import About from './pages/About';
import Settings from './pages/Settings';
import Learn from './pages/Learn';
import CourseView from './pages/CourseView';
import LessonView from './pages/LessonView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const signedIn = await puterService.isSignedIn();
      setIsAuthenticated(signedIn);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/funding" element={<Funding />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:courseId" element={<CourseView />} />
          <Route path="/learn/:courseId/:lessonId" element={<LessonView />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
