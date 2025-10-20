import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const PermissoesPage: React.FC = () => {
  return (
    <Card bordered={false}>
      <Title level={3}>PERMISSÕES</Title>
      <Paragraph type="secondary">
        Configuração de permissões (em desenvolvimento).
      </Paragraph>
    </Card>
  );
};

export default PermissoesPage;