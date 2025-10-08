import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const StakeholdersPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Stakeholders e Relacionamentos</Title>
      <Paragraph>
        CRM leve com funcionalidades para gerenciar contatos, visão 360° por executivo, histórico, tags e segmentação de stakeholders.
      </Paragraph>
      <Paragraph>
        Foco na gestão eficiente de relacionamentos para o secretariado executivo.
      </Paragraph>
    </div>
  );
};

export default StakeholdersPage;
