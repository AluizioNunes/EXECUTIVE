import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const GovernancePage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Governança e Compliance</Title>
      <Paragraph>
        Implementação de fluxos de aprovação multi-step, trilhas de auditoria imutáveis, registros de decisões e controle de acessos (RBAC/ABAC).
      </Paragraph>
      <Paragraph>
        Garantia de segurança e compliance com regulamentações como LGPD/GDPR.
      </Paragraph>
    </div>
  );
};

export default GovernancePage;
