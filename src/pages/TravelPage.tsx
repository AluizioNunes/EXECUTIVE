import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const TravelPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Viagens e Deslocamentos</Title>
      <Paragraph>
        Funcionalidades para solicitações, políticas, aprovação e integração com provedores de viagem, gerando itinerários consolidados.
      </Paragraph>
      <Paragraph>
        Futuramente, assistente IA para otimização de roteiros e custos.
      </Paragraph>
    </div>
  );
};

export default TravelPage;
