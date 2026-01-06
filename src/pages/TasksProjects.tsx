import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const TasksProjectsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Tarefas/Projetos (PMO Tático)</Title>
      <Paragraph>
        Ferramentas para Kanban, gestão de dependências, metas, reuniões de acompanhamento e automações com n8n.
      </Paragraph>
      <Paragraph>
        Geração automática de atas por sprint/reunião para otimizar a gestão de projetos.
      </Paragraph>
    </div>
  );
};

export default TasksProjectsPage;
