import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { HomeOutlined, CalendarOutlined, GlobalOutlined, FileTextOutlined, BlockOutlined, ProjectOutlined, TeamOutlined, RobotOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const { Header, Content, Footer, Sider } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Início' },
  { key: '/agenda', icon: <CalendarOutlined />, label: 'Agenda Global' },
  { key: '/travel', icon: <GlobalOutlined />, label: 'Viagens' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'Documentos' },
  { key: '/governance', icon: <BlockOutlined />, label: 'Governança' },
  { key: '/tasks-projects', icon: <ProjectOutlined />, label: 'Tarefas/Projetos' },
  { key: '/stakeholders', icon: <TeamOutlined />, label: 'Stakeholders' },
  { key: '/ai-assistant', icon: <RobotOutlined />, label: 'Assistente IA' },
];

const AppLayout: React.FC = () => {
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="demo-logo-vertical" />
        <Menu theme="dark" defaultSelectedKeys={[location.pathname]} mode="inline" items={menuItems} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '0 16px' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG, marginTop: '24px' }}
          >
            <Outlet />
          </motion.div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Executive Secretariat ©{new Date().getFullYear()} Created by Gemini
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
