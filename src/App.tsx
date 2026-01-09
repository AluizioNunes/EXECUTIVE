import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Typography, Badge, Tooltip, Select } from 'antd';
import type { MenuProps } from 'antd';
import { HomeOutlined, CalendarOutlined, GlobalOutlined, FileTextOutlined, ProjectOutlined, TeamOutlined, DollarOutlined, UserOutlined, SettingOutlined, LogoutOutlined, BellOutlined, BarChartOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userData } from './data/mockData';
import { useTenant } from './contexts/TenantContext';
import Login from './pages/Login';
import executiveLogo from './assets/Images/EXECUTIVE LOGO.png';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const baseMenuItems: MenuProps['items'] = [
  { key: '/', icon: <HomeOutlined />, label: 'INICIO' },
  {
    key: '/cadastros',
    icon: <AppstoreOutlined />,
    label: 'CADASTROS',
    children: [
      { key: '/cadastros/pf', label: 'PF - PESSOA FÍSICA' },
      { key: '/cadastros/pj', label: 'PJ - PESSOA JURÍDICA' },
      { key: '/cadastros/funcao', label: 'FUNÇÃO' },
      { key: '/cadastros/executivos', label: 'EXECUTIVOS' },
      { key: '/cadastros/ativos', label: 'ATIVOS' },
    ],
  },
  {
    key: '/gestao-interna',
    icon: <AppstoreOutlined />,
    label: 'GESTÃO INTERNA',
    children: [
      { key: '/gestao-interna/empresas', label: 'EMPRESAS' },
      { key: '/gestao-interna/colaboradores', label: 'COLABORADORES' },
      { key: '/gestao-interna/departamentos', label: 'DEPARTAMENTOS' },
      { key: '/gestao-interna/funcoes', label: 'FUNÇÕES' },
      { key: '/gestao-interna/fornecedores', label: 'FORNECEDORES', disabled: true },
      { key: '/gestao-interna/ativos', label: 'ATIVOS' },
    ],
  },
  { key: '/agenda', icon: <CalendarOutlined />, label: 'AGENDA GLOBAL' },
  { key: '/travel', icon: <GlobalOutlined />, label: 'VIAGENS' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'DOCUMENTOS' },
  { key: '/tasks', icon: <ProjectOutlined />, label: 'TAREFAS' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'PROJETOS' },
  {
    key: '/financial',
    icon: <DollarOutlined />,
    label: 'FINANCEIRO',
    children: [
      { key: '/financial/contas-a-pagar', label: 'CONTAS A PAGAR' },
      { key: '/financial/contas-a-receber', label: 'CONTAS A RECEBER' },
      { key: '/financial/contas', label: 'CONTAS' },
      { key: '/financial/centro-de-custos', label: 'CENTRO DE CUSTOS' },
    ],
  },
  { key: '/stakeholders', icon: <TeamOutlined />, label: 'STAKEHOLDERS' },
  { key: '/analytics', icon: <BarChartOutlined />, label: 'ANALYTICS' },
  {
    key: '/sistema',
    icon: <SettingOutlined />,
    label: 'SISTEMA',
    children: [
      { key: '/sistema/usuario', label: 'USUARIO' },
      { key: '/sistema/perfil', label: 'PERFIL' },
      { key: '/sistema/permissoes', label: 'PERMISSÕES' },
      { key: '/sistema/empresas', label: 'EMPRESAS' },
      { key: '/sistema/tenants', label: 'TENANTS' },
    ],
  },
];

const AppLayout: React.FC = () => {
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionTime, setSessionTime] = useState(0);
  const { currentTenant, tenants, switchTenant } = useTenant();
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [authInfo, setAuthInfo] = useState(() => ({
    usuario: localStorage.getItem('auth_usuario') || '',
    role: localStorage.getItem('auth_role') || '',
    nome: localStorage.getItem('auth_nome') || '',
    perfil: localStorage.getItem('auth_perfil') || '',
    tenantSlug: localStorage.getItem('auth_tenant_slug') || '',
    loginAt: Number(localStorage.getItem('auth_login_at') || Date.now()),
  }));

  const menuItems: MenuProps['items'] = useMemo(() => {
    const isExecutive = String(authInfo.tenantSlug || '').toLowerCase() === 'executive';
    if (isExecutive) return baseMenuItems;

    const filterItems = (items: MenuProps['items']): MenuProps['items'] => {
      if (!items) return items;
      return (items as any[])
        .map((item) => {
          if (!item || typeof item !== 'object') return item;
          if ((item as any).key === '/sistema/tenants') return null;
          if (Array.isArray((item as any).children)) {
            return { ...(item as any), children: filterItems((item as any).children) };
          }
          return item;
        })
        .filter(Boolean) as MenuProps['items'];
    };

    return filterItems(baseMenuItems);
  }, [authInfo.tenantSlug]);
  const normalizedPathname = useMemo(() => {
    const p = location.pathname || '/';
    const match = p.match(/^\/(\d+)(\/.*)?$/);
    if (!match) return p;
    const rest = match[2] || '';
    return rest === '' ? '/' : rest;
  }, [location.pathname]);

  const selectedMenuKeys = useMemo(() => [normalizedPathname], [normalizedPathname]);
  const isDashboard = normalizedPathname === '/';

  const toTenantPath = useCallback(
    (path: string) => {
      if (!currentTenant) return path;
      if (path === '/') return `/${currentTenant.id}`;
      return `/${currentTenant.id}${path}`;
    },
    [currentTenant]
  );

  const handleMenuClick = useCallback(
    (e: { key: string }) => {
      navigate(toTenantPath(e.key));
    },
    [navigate, toTenantPath]
  );

  // Atualizar tempo de sessão a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setSessionTime(differenceInMinutes(now, new Date(authInfo.loginAt)));
    }, 60000); // Atualiza a cada minuto

    // Atualizar imediatamente
    const now = new Date();
    setSessionTime(differenceInMinutes(now, new Date(authInfo.loginAt)));

    return () => clearInterval(interval);
  }, [authInfo.loginAt]);

  useEffect(() => {
    if (!authToken) return;
    const body = authToken.split('.', 2)[0] || '';
    try {
      let b64 = body.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      const json = JSON.parse(atob(b64));
      const exp = Number(json?.exp);
      if (Number.isFinite(exp) && Date.now() / 1000 > exp) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_usuario');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_tenant_slug');
        localStorage.removeItem('auth_login_at');
        setAuthToken(null);
      }
    } catch {
      return;
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setAuthInfo({ usuario: '', role: '', nome: '', perfil: '', tenantSlug: '', loginAt: Date.now() });
      return;
    }
    setAuthInfo({
      usuario: localStorage.getItem('auth_usuario') || '',
      role: localStorage.getItem('auth_role') || '',
      nome: localStorage.getItem('auth_nome') || '',
      perfil: localStorage.getItem('auth_perfil') || '',
      tenantSlug: localStorage.getItem('auth_tenant_slug') || '',
      loginAt: Number(localStorage.getItem('auth_login_at') || Date.now()),
    });
  }, [authToken]);

  const formatSessionTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const userMenuItems = useMemo(
    () => [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Perfil',
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Configurações',
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sair',
        danger: true,
      },
    ],
    []
  );

  const handleUserMenuClick = useCallback(({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        console.log('Abrir perfil');
        break;
      case 'settings':
        console.log('Abrir configurações');
        break;
      case 'logout':
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_usuario');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_nome');
        localStorage.removeItem('auth_perfil');
        localStorage.removeItem('auth_tenant_slug');
        localStorage.removeItem('auth_tenant_id');
        localStorage.removeItem('auth_tenant_name');
        localStorage.removeItem('auth_login_at');
        window.dispatchEvent(new Event('executive-auth-changed'));
        setAuthToken(null);
        navigate('/');
        break;
    }
  }, [navigate]);

  const dropdownMenu = useMemo(
    () => ({ items: userMenuItems, onClick: handleUserMenuClick }),
    [userMenuItems, handleUserMenuClick]
  );

  const tenantOptions = useMemo(
    () => tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
    [tenants]
  );

  const handleTenantChange = useCallback(
    (tenantId: number) => {
      switchTenant(tenantId);
      const targetPath = normalizedPathname === '/' ? `/${tenantId}` : `/${tenantId}${normalizedPathname}`;
      navigate(targetPath);
    },
    [switchTenant, normalizedPathname, navigate]
  );

  useEffect(() => {
    const isExecutive = String(authInfo.tenantSlug || '').toLowerCase() === 'executive';
    if (isExecutive) return;
    if (!currentTenant || currentTenant.id !== 0) return;
    const fallback = tenants.find((t) => t.id !== 0);
    if (!fallback) return;
    switchTenant(fallback.id);
    const targetPath = normalizedPathname === '/' ? `/${fallback.id}` : `/${fallback.id}${normalizedPathname}`;
    navigate(targetPath, { replace: true });
  }, [authInfo.tenantSlug, currentTenant, tenants, switchTenant, normalizedPathname, navigate]);

  if (!authToken) {
    return (
      <Layout style={{ minHeight: '100vh', width: '100%', background: '#0b1220' }}>
        <Login open onLoggedIn={(t) => setAuthToken(t)} />
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Layout style={{ width: '100%', minHeight: '100vh' }}>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: '96px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(toTenantPath('/'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(toTenantPath('/'));
              }}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <img
                src={executiveLogo}
                alt="Executive"
                style={{
                  height: 81,
                  width: 'auto',
                  maxWidth: 495,
                  objectFit: 'contain',
                  display: 'block',
                  mixBlendMode: 'multiply',
                  filter: 'brightness(1.25) contrast(1.05)',
                }}
              />
            </div>
            {String(authInfo.tenantSlug || '').toLowerCase() === 'executive' && currentTenant && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 12, textTransform: 'uppercase' }}>Tenant:</Text>
                <Select
                  value={currentTenant.id}
                  style={{ width: 220 }}
                  onChange={handleTenantChange}
                  size="middle"
                  options={tenantOptions}
                />
              </div>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px',
            height: '100%'
          }}>
            <Tooltip title="Notificações">
              <Badge count={3} size="small">
                <BellOutlined style={{ fontSize: '18px', cursor: 'pointer' }} />
              </Badge>
            </Tooltip>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              height: '100%',
              padding: '8px 0'
            }}>
              <div style={{ 
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                minWidth: '220px',
                textTransform: 'uppercase'
              }}>
                <Text strong style={{ 
                  display: 'block',
                  fontSize: '18px',
                  lineHeight: '1.2',
                  marginBottom: '6px'
                }}>
                  {String(authInfo.nome || authInfo.usuario || '-')}
                </Text>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                    {authInfo.usuario || '-'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                    {authInfo.perfil || authInfo.role || '-'}
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.2', marginTop: '4px' }}>
                  TENANT: {authInfo.tenantSlug || '-'}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.2', marginTop: '4px' }}>
                  LOGIN: {format(new Date(authInfo.loginAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })} | CONEXÃO: {formatSessionTime(sessionTime)}
                </Text>
              </div>
              
              <Dropdown
                menu={dropdownMenu}
                placement="bottomRight"
                arrow
              >
                <Avatar 
                  size={44} 
                  src={userData.avatar}
                  style={{ 
                    cursor: 'pointer',
                    border: '2px solid #f0f0f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {(authInfo.usuario || '').slice(0, 2).toUpperCase() || 'U'}
                </Avatar>
              </Dropdown>
            </div>
          </div>
        </Header>

        <div
          style={{
            position: 'fixed',
            top: 96,
            left: 0,
            right: 0,
            zIndex: 999,
            background: colorBgContainer,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderBottom: '1px solid rgba(5, 5, 5, 0.06)',
            overflow: 'hidden'
          }}
        >
          <Menu
            mode="horizontal"
            selectedKeys={selectedMenuKeys}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderBottom: 'none' }}
          />
        </div>
        
        {/* Conteúdo principal com margem para o navbar fixo */}
        <Content style={{ 
          margin: '0', 
          padding: '0',
          width: '100%',
          background: '#f0f2f5',
          marginTop: '144px'
        }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ 
              padding: 24,
              minHeight: 'calc(100vh - 160px)',
              background: isDashboard ? 'transparent' : colorBgContainer,
              borderRadius: isDashboard ? 0 : borderRadiusLG,
              margin: isDashboard ? 0 : '24px',
              width: isDashboard ? '100%' : `calc(100% - 48px)`
            }}
          >
            <Outlet />
          </motion.div>
        </Content>
        
        <Footer style={{ textAlign: 'center', width: '100%' }}>
          Executive Secretariat ©{new Date().getFullYear()} Created by Gemini
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
