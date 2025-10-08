import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Typography, Badge, Tooltip } from 'antd';
import { HomeOutlined, CalendarOutlined, GlobalOutlined, FileTextOutlined, BlockOutlined, ProjectOutlined, TeamOutlined, RobotOutlined, DollarOutlined, UserOutlined, SettingOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userData } from './data/mockData';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Início' },
  { key: '/agenda', icon: <CalendarOutlined />, label: 'Agenda Global' },
  { key: '/travel', icon: <GlobalOutlined />, label: 'Viagens' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'Documentos' },
  { key: '/governance', icon: <BlockOutlined />, label: 'Governança' },
  { key: '/tasks', icon: <ProjectOutlined />, label: 'Tarefas' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Projetos' },
  { key: '/financial', icon: <DollarOutlined />, label: 'Financeiro' },
  { key: '/stakeholders', icon: <TeamOutlined />, label: 'Stakeholders' },
  { key: '/ai-assistant', icon: <RobotOutlined />, label: 'Assistente IA' },
];

const AppLayout: React.FC = () => {
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

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

  const userMenuItems = [
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
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
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
  };

  const siderWidth = collapsed ? 80 : 256;

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      {/* Sidebar com altura máxima */}
      <Sider 
        collapsible 
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ 
          position: 'fixed', 
          left: 0, 
          top: 0,
          height: '100vh',
          zIndex: 1000,
          overflow: 'auto'
        }}
        width={256}
        collapsedWidth={80}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? '16px' : '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? 'ES' : 'Executive Secretariat'}
        </div>
        <Menu 
          theme="dark" 
          defaultSelectedKeys={[location.pathname]} 
          mode="inline" 
          items={menuItems} 
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>
      
      {/* Layout principal com navbar fixo */}
      <Layout style={{ 
        marginLeft: siderWidth, 
        width: `calc(100% - ${siderWidth}px)`,
        transition: 'all 0.2s',
        minHeight: '100vh'
      }}>
        {/* Navbar fixo no topo */}
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
          right: 0,
          zIndex: 999,
          marginLeft: siderWidth,
          width: `calc(100% - ${siderWidth}px)`
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
                menu={{ 
                  items: userMenuItems, 
                  onClick: handleUserMenuClick 
                }}
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
        
        {/* Conteúdo principal com margem para o navbar fixo */}
        <Content style={{ 
          margin: '0', 
          padding: '0',
          width: '100%',
          background: '#f0f2f5',
          marginTop: '64px'
        }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ 
              padding: 24, 
              minHeight: 'calc(100vh - 112px)', 
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
