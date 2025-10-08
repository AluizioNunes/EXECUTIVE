import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const AIAssistantPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Assistente IA Orquestrado</Title>
      <Paragraph>
        Funcionalidades de IA para sumários de reuniões, extração de ações e riscos, rascunhos de e-mails, tradução, insights de agenda e consultas a políticas.
      </Paragraph>
      <Paragraph>
        Um assistente inteligente para aumentar a produtividade e eficiência do secretariado.
      </Paragraph>
    </div>
  );
};

export default AIAssistantPage;
