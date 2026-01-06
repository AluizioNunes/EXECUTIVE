import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const PessoaFisicaPage: React.FC = () => {
  return (
    <Card variant="borderless">
      <Title level={3}>PF - Pessoa Física</Title>
      <Paragraph type="secondary">
        Cadastro de Pessoa Física (em desenvolvimento).
      </Paragraph>
    </Card>
  );
};

export default PessoaFisicaPage;
