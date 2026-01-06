import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Typography, Badge, Tooltip, Select } from 'antd';
import { HomeOutlined, CalendarOutlined, GlobalOutlined, FileTextOutlined, ProjectOutlined, TeamOutlined, DollarOutlined, UserOutlined, SettingOutlined, LogoutOutlined, BellOutlined, BarChartOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userData } from './data/mockData';
import { useTenant } from './contexts/TenantContext';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const menuItems = [
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
    ],
  },
];

const AppLayout: React.FC = () => {
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionTime, setSessionTime] = useState(0);
  const { currentTenant, tenants, switchTenant } = useTenant();
  const normalizedPathname = useMemo(() => {
    const p = location.pathname || '/';
    const match = p.match(/^\/(\d+)(\/.*)?$/);
    if (!match) return p;
    const rest = match[2] || '';
    return rest === '' ? '/' : rest;
  }, [location.pathname]);

  const selectedMenuKeys = useMemo(() => [normalizedPathname], [normalizedPathname]);

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
      const loginTime = userData.loginTime;
      setSessionTime(differenceInMinutes(now, loginTime));
    }, 60000); // Atualiza a cada minuto

    // Atualizar imediatamente
    const now = new Date();
    const loginTime = userData.loginTime;
    setSessionTime(differenceInMinutes(now, loginTime));

    return () => clearInterval(interval);
  }, []);

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
        console.log('Fazer logout');
        break;
    }
  }, []);

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
    },
    [switchTenant]
  );

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
          height: '64px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Text>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px',
            height: '100%'
          }}>
            {/* Tenant Selector */}
            {currentTenant && (
              <Select
                value={currentTenant.id}
                style={{ width: 200 }}
                onChange={handleTenantChange}
                size="middle"
                options={tenantOptions}
              >
              </Select>
            )}
            
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
                minWidth: '200px'
              }}>
                <Text strong style={{ 
                  display: 'block', 
                  fontSize: '14px',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  {userData.name}
                </Text>
                <Text type="secondary" style={{ 
                  fontSize: '12px',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  {userData.role}
                </Text>
                <Text type="secondary" style={{ 
                  fontSize: '11px',
                  lineHeight: '1.2'
                }}>
                  Conexão: {formatSessionTime(sessionTime)}
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
                  {userData.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
              </Dropdown>
            </div>
          </div>
        </Header>

        <div
          style={{
            position: 'fixed',
            top: 64,
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
          marginTop: '112px'
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
              background: colorBgContainer, 
              borderRadius: borderRadiusLG, 
              margin: '24px',
              width: `calc(100% - 48px)`
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
