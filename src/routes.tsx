import React from 'react';
import { Navigate, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './App';
import HomePage from './pages/Home';
import AgendaPage from './pages/Agenda';
import TravelPage from './pages/Travel';
import DocumentsPage from './pages/Documents';
import GovernancePage from './pages/Governance';
import TasksPage from './pages/Tasks';
import ProjectsPage from './pages/Projects';
import FinancialPage from './pages/Financial';
import StakeholdersPage from './pages/Stakeholders';
import AIAssistantPage from './pages/AIAssistant';
import AnalyticsPage from './pages/Analytics';
import Perfil from './pages/Perfil';
import PF from './pages/PF';
import PJ from './pages/PJ';
import UsuarioPage from './pages/Usuario';
import PermissoesPage from './pages/Permissoes';
import Empresas from './pages/Empresas';
import Contas from './pages/Contas.tsx';
import ContasPagar from './pages/ContasPagar.tsx';
import ExecutivosPage from './pages/Executivos';
import Ativos from './pages/Ativos';
import CentroCustos from './pages/CentroCustos';
import Tenants from './pages/Tenants';

// Wrapper components para passar tenant para as páginas
const TenantAwarePageWrapper: React.FC<{ Component: React.ComponentType }> = ({ Component }) => {
  // O tenant já está disponível através do contexto TenantContext
  return <Component />;
};

const FinancialWrapper: React.FC = () => {
  return <Outlet />;
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
      {
        path: 'financial',
        element: <FinancialWrapper />,
        children: [
          { index: true, element: <Navigate to="contas" replace /> },
          { path: 'contas-a-pagar', element: <TenantAwarePageWrapper Component={ContasPagar} /> },
          { path: 'contas-a-receber', element: <TenantAwarePageWrapper Component={FinancialPage} /> },
          { path: 'contas', element: <TenantAwarePageWrapper Component={Contas} /> },
          { path: 'centro-de-custos', element: <TenantAwarePageWrapper Component={CentroCustos} /> },
        ],
      },
      { path: 'stakeholders', element: <TenantAwarePageWrapper Component={StakeholdersPage} /> },
      { path: 'ai-assistant', element: <TenantAwarePageWrapper Component={AIAssistantPage} /> },
      { path: 'analytics', element: <TenantAwarePageWrapper Component={AnalyticsPage} /> },
      // Novas rotas de CADASTROS e SISTEMA
      { path: 'cadastros/pf', element: <TenantAwarePageWrapper Component={PF} /> },
      { path: 'cadastros/pj', element: <TenantAwarePageWrapper Component={PJ} /> },
      { path: 'cadastros/funcao', element: <TenantAwarePageWrapper Component={Perfil} /> },
      { path: 'cadastros/executivos', element: <TenantAwarePageWrapper Component={ExecutivosPage} /> },
      { path: 'cadastros/ativos', element: <TenantAwarePageWrapper Component={Ativos} /> },
      { path: 'sistema/usuario', element: <TenantAwarePageWrapper Component={UsuarioPage} /> },
      { path: 'sistema/perfil', element: <TenantAwarePageWrapper Component={Perfil} /> },
      { path: 'sistema/permissoes', element: <TenantAwarePageWrapper Component={PermissoesPage} /> },
      { path: 'sistema/empresas', element: <TenantAwarePageWrapper Component={Empresas} /> },
      { path: 'sistema/tenants', element: <TenantAwarePageWrapper Component={Tenants} /> },
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
      {
        path: 'financial',
        element: <FinancialWrapper />,
        children: [
          { index: true, element: <Navigate to="contas" replace /> },
          { path: 'contas-a-pagar', element: <TenantAwarePageWrapper Component={ContasPagar} /> },
          { path: 'contas-a-receber', element: <TenantAwarePageWrapper Component={FinancialPage} /> },
          { path: 'contas', element: <TenantAwarePageWrapper Component={Contas} /> },
          { path: 'centro-de-custos', element: <TenantAwarePageWrapper Component={CentroCustos} /> },
        ],
      },
      { path: 'stakeholders', element: <TenantAwarePageWrapper Component={StakeholdersPage} /> },
      { path: 'ai-assistant', element: <TenantAwarePageWrapper Component={AIAssistantPage} /> },
      { path: 'analytics', element: <TenantAwarePageWrapper Component={AnalyticsPage} /> },
      // Novas rotas de CADASTROS e SISTEMA por tenant
      { path: 'cadastros/pf', element: <TenantAwarePageWrapper Component={PF} /> },
      { path: 'cadastros/pj', element: <TenantAwarePageWrapper Component={PJ} /> },
      { path: 'cadastros/funcao', element: <TenantAwarePageWrapper Component={Perfil} /> },
      { path: 'cadastros/executivos', element: <TenantAwarePageWrapper Component={ExecutivosPage} /> },
      { path: 'cadastros/ativos', element: <TenantAwarePageWrapper Component={Ativos} /> },
      { path: 'sistema/usuario', element: <TenantAwarePageWrapper Component={UsuarioPage} /> },
      { path: 'sistema/perfil', element: <TenantAwarePageWrapper Component={Perfil} /> },
      { path: 'sistema/permissoes', element: <TenantAwarePageWrapper Component={PermissoesPage} /> },
      { path: 'sistema/empresas', element: <TenantAwarePageWrapper Component={Empresas} /> },
      { path: 'sistema/tenants', element: <TenantAwarePageWrapper Component={Tenants} /> },
    ],
  },
]);

const AppRoutes: React.FC = () => {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
};

export default AppRoutes;
