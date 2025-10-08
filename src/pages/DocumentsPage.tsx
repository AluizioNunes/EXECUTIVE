import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const DocumentsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Documentos e Comunicação Formal</Title>
      <Paragraph>
        Gestão de minutas, atas, termos e e-mails oficiais com suporte de IA, incluindo versionamento, aprovação e trilhas de auditoria.
      </Paragraph>
      <Paragraph>
        Biblioteca de templates por país/idioma para agilizar a criação de documentos.
      </Paragraph>
    </div>
  );
};

export default DocumentsPage;
