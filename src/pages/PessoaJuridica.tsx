import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const PessoaJuridicaPage: React.FC = () => {
  return (
    <Card variant="borderless">
      <Title level={3}>PJ - Pessoa Jurídica</Title>
      <Paragraph type="secondary">
        Cadastro de Pessoa Jurídica (em desenvolvimento).
      </Paragraph>
    </Card>
  );
};

export default PessoaJuridicaPage;
