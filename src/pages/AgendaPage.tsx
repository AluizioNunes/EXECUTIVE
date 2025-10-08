import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const AgendaPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Agenda Global e Multi-Fuso</Title>
      <Paragraph>
        Gerenciamento de calendários por executivo, bloqueios inteligentes, janelas de viagem, fusos horários e integração com Google Calendar/Microsoft.
      </Paragraph>
      <Paragraph>
        Implementação de regras de conflito, prioridade, SLA de confirmação e templates para reuniões recorrentes.
      </Paragraph>
    </div>
  );
};

export default AgendaPage;
