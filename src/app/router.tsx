import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { AdminShell } from './layout/AdminShell';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AuthProvider } from '../features/auth/AuthContext';
import { Spinner } from '../shared/ui/Spinner';

// Lazy load pages
import Home from '../pages/Home';
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
        element: <Home />,
      },
      {
        path: '*',
        element: <div className="p-8 text-center text-red-500">Página não encontrada</div>,
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
