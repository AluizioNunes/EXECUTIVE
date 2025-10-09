import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './App';
import HomePage from './pages/HomePage';
import AgendaPage from './pages/AgendaPage';
import TravelPage from './pages/TravelPage';
import DocumentsPage from './pages/DocumentsPage';
import GovernancePage from './pages/GovernancePage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import FinancialPage from './pages/FinancialPage';
import StakeholdersPage from './pages/StakeholdersPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Wrapper components para passar tenant para as páginas
const TenantAwarePageWrapper: React.FC<{ Component: React.ComponentType }> = ({ Component }) => {
  // O tenant já está disponível através do contexto TenantContext
  return <Component />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TenantAwarePageWrapper Component={HomePage} /> },
      { path: 'agenda', element: <TenantAwarePageWrapper Component={AgendaPage} /> },
      { path: 'travel', element: <TenantAwarePageWrapper Component={TravelPage} /> },
      { path: 'documents', element: <TenantAwarePageWrapper Component={DocumentsPage} /> },
      { path: 'governance', element: <TenantAwarePageWrapper Component={GovernancePage} /> },
      { path: 'tasks', element: <TenantAwarePageWrapper Component={TasksPage} /> },
      { path: 'projects', element: <TenantAwarePageWrapper Component={ProjectsPage} /> },
      { path: 'financial', element: <TenantAwarePageWrapper Component={FinancialPage} /> },
      { path: 'stakeholders', element: <TenantAwarePageWrapper Component={StakeholdersPage} /> },
      { path: 'ai-assistant', element: <TenantAwarePageWrapper Component={AIAssistantPage} /> },
      { path: 'analytics', element: <TenantAwarePageWrapper Component={AnalyticsPage} /> },
    ],
  },
  // Rotas específicas por tenant (opcional)
  {
    path: '/:tenantId',
    element: <AppLayout />,
    children: [
      { index: true, element: <TenantAwarePageWrapper Component={HomePage} /> },
      { path: 'agenda', element: <TenantAwarePageWrapper Component={AgendaPage} /> },
      { path: 'travel', element: <TenantAwarePageWrapper Component={TravelPage} /> },
      { path: 'documents', element: <TenantAwarePageWrapper Component={DocumentsPage} /> },
      { path: 'governance', element: <TenantAwarePageWrapper Component={GovernancePage} /> },
      { path: 'tasks', element: <TenantAwarePageWrapper Component={TasksPage} /> },
      { path: 'projects', element: <TenantAwarePageWrapper Component={ProjectsPage} /> },
      { path: 'financial', element: <TenantAwarePageWrapper Component={FinancialPage} /> },
      { path: 'stakeholders', element: <TenantAwarePageWrapper Component={StakeholdersPage} /> },
      { path: 'ai-assistant', element: <TenantAwarePageWrapper Component={AIAssistantPage} /> },
      { path: 'analytics', element: <TenantAwarePageWrapper Component={AnalyticsPage} /> },
    ],
  },
]);

const AppRoutes: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;