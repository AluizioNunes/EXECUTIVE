import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './App';
import HomePage from './pages/HomePage';
import AgendaPage from './pages/AgendaPage';
import TravelPage from './pages/TravelPage';
import DocumentsPage from './pages/DocumentsPage';
import GovernancePage from './pages/GovernancePage';
import TasksProjectsPage from './pages/TasksProjectsPage';
import StakeholdersPage from './pages/StakeholdersPage';
import AIAssistantPage from './pages/AIAssistantPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'travel', element: <TravelPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'governance', element: <GovernancePage /> },
      { path: 'tasks-projects', element: <TasksProjectsPage /> },
      { path: 'stakeholders', element: <StakeholdersPage /> },
      { path: 'ai-assistant', element: <AIAssistantPage /> },
    ],
  },
]);

const AppRoutes: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
