import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { AdminShell } from './layout/AdminShell';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AuthProvider } from '../features/auth/AuthContext';
import { Spinner } from '../shared/ui/Spinner';

// Lazy load pages
const DevotionalPage = lazy(() => import('../features/devotional/DevotionalPage'));
const QuizPage = lazy(() => import('../features/quiz/QuizPage'));
const WordGamePage = lazy(() => import('../features/games/word/WordGamePage'));
const SnakePage = lazy(() => import('../features/games/snake/SnakePage'));
const StarMapPage = lazy(() => import('../features/maps/StarMapPage'));
const TimelinePage = lazy(() => import('../features/timeline/TimelinePage'));
const MemoryGamePage = lazy(() => import('../features/games/memory/MemoryGamePage'));
const SyncPage = lazy(() => import('../features/games/sync/SyncPage'));
const RetrospectivePage = lazy(() => import('../features/retrospective-v2/RetrospectivePage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ConfigPage = lazy(() => import('../pages/admin/ConfigPage'));
const AlbumEditor = lazy(() => import('../pages/admin/AlbumEditor'));
const TimelineEditor = lazy(() => import('../pages/admin/TimelineEditor'));
const PlaylistEditor = lazy(() => import('../pages/admin/PlaylistEditor'));
const RouletteEditor = lazy(() => import('../pages/admin/RouletteEditor'));
const StarMapEditor = lazy(() => import('../pages/admin/StarMapEditor'));
const RetrospectiveEditor = lazy(() => import('../pages/admin/RetrospectiveEditor'));
const SharePage = lazy(() => import('../pages/admin/SharePage'));
const QuizEditor = lazy(() => import('../pages/admin/QuizEditor'));
const TokenEditor = lazy(() => import('../pages/admin/TokenEditor'));
const Unauthorized = lazy(() => import('../pages/admin/Unauthorized'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div className="flex h-full items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      {
        index: true,
        element: null,
      },
      {
        path: 'devotional',
        element: (
          <SuspenseWrapper>
            <DevotionalPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'quiz',
        element: (
          <SuspenseWrapper>
            <QuizPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'couple-quiz',
        element: <Navigate to="/quiz" replace />,
      },
      {
        path: 'word-game',
        element: (
          <SuspenseWrapper>
            <WordGamePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'palavras',
        element: <Navigate to="/word-game" replace />,
      },
      {
        path: 'snake',
        element: (
          <SuspenseWrapper>
            <SnakePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'cobrinha',
        element: <Navigate to="/snake" replace />,
      },
      {
        path: 'star-map',
        element: (
          <SuspenseWrapper>
            <StarMapPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'starmap',
        element: <Navigate to="/star-map" replace />,
      },
      {
        path: 'mapa-estelar',
        element: <Navigate to="/star-map" replace />,
      },
      {
        path: 'timeline',
        element: (
          <SuspenseWrapper>
            <TimelinePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'historia',
        element: <Navigate to="/timeline" replace />,
      },
      {
        path: 'nossa-historia',
        element: <Navigate to="/timeline" replace />,
      },
      {
        path: 'memory-game',
        element: (
          <SuspenseWrapper>
            <MemoryGamePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'memoria',
        element: <Navigate to="/memory-game" replace />,
      },
      {
        path: 'sync',
        element: (
          <SuspenseWrapper>
            <SyncPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'sincronia',
        element: <Navigate to="/sync" replace />,
      },
      {
        path: 'retrospective',
        element: (
          <SuspenseWrapper>
            <RetrospectivePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'retrospectiva',
        element: <Navigate to="/retrospective" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/admin/login',
    element: (
      <AuthProvider>
        <SuspenseWrapper>
          <LoginPage />
        </SuspenseWrapper>
      </AuthProvider>
    ),
  },
  {
    path: '/admin',
    element: (
      <AuthProvider>
        <ProtectedRoute>
          <AdminShell />
        </ProtectedRoute>
      </AuthProvider>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <AdminDashboard />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'config',
        element: (
          <SuspenseWrapper>
            <ConfigPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'album',
        element: (
          <SuspenseWrapper>
            <AlbumEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'timeline',
        element: (
          <SuspenseWrapper>
            <TimelineEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'playlist',
        element: (
          <SuspenseWrapper>
            <PlaylistEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'roulette',
        element: (
          <SuspenseWrapper>
            <RouletteEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'starmap',
        element: (
          <SuspenseWrapper>
            <StarMapEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'retrospective',
        element: (
          <SuspenseWrapper>
            <RetrospectiveEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'share',
        element: (
          <SuspenseWrapper>
            <SharePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'quiz',
        element: (
          <SuspenseWrapper>
            <QuizEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'tokens',
        element: (
          <SuspenseWrapper>
            <TokenEditor />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'unauthorized',
        element: (
          <SuspenseWrapper>
            <Unauthorized />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);
