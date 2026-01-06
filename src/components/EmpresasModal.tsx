import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { Empresa } from '../pages/Empresas.tsx';

interface EmpresasModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Empresa>;
  onCancel: () => void;
  onSave: (data: Omit<Empresa, 'IdEmpresas'> & Partial<Pick<Empresa, 'IdEmpresas'>>) => void;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });

const EmpresasModal: React.FC<EmpresasModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const nextLogo = initialData?.Logomarca ? String(initialData.Logomarca) : undefined;
    setLogoPreview(nextLogo);
    form.setFieldsValue({
      CNPJ: initialData?.CNPJ ?? '',
      RazaoSocial: initialData?.RazaoSocial ?? '',
      NomeFantasia: initialData?.NomeFantasia ?? '',
      Logomarca: initialData?.Logomarca ?? undefined,
    });
  }, [open, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
      setLogoPreview(undefined);
    } catch {}
  };

  const uploadProps = useMemo(() => {
    return {
      accept: 'image/*',
      maxCount: 1,
      showUploadList: false,
      beforeUpload: async (file: File) => {
        const dataUrl = await toDataUrl(file);
        setLogoPreview(dataUrl);
        form.setFieldsValue({ Logomarca: dataUrl });
        return false;
      },
    };
  }, [form]);

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        setLogoPreview(undefined);
        onCancel();
      }}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="CNPJ"
          label="CNPJ"
          rules={[{ required: true, message: 'Informe o CNPJ' }, { pattern: /^\d{14}$/, message: 'CNPJ deve conter 14 dígitos' }]}
          getValueFromEvent={(e) => String(e.target.value).replace(/\D/g, '').slice(0, 14)}
          getValueProps={(value) => {
            const raw = String(value ?? '');
            const d = onlyDigits(raw).slice(0, 14);
            if (d.length <= 2) return { value: d };
            if (d.length <= 5) return { value: `${d.slice(0, 2)}.${d.slice(2)}` };
            if (d.length <= 8) return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}` };
            if (d.length <= 12) return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}` };
            return { value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}` };
          }}
        >
          <Input inputMode="numeric" placeholder="00.000.000/0000-00" />
        </Form.Item>

        <Form.Item name="RazaoSocial" label="Razão Social" rules={[{ required: true, message: 'Informe a Razão Social' }]}>
          <Input placeholder="Ex.: ENGECO - ENGENHARIA E CONSTRUÇÃO LTDA." />
        </Form.Item>

        <Form.Item name="NomeFantasia" label="Nome Fantasia" rules={[{ required: true, message: 'Informe o Nome Fantasia' }]}>
          <Input placeholder="Ex.: ENGECO" />
        </Form.Item>

        <Form.Item name="Logomarca" label="Logomarca">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Upload {...(uploadProps as any)}>
              <Button icon={<UploadOutlined />}>Selecionar imagem</Button>
            </Upload>
            {logoPreview ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img
                  src={logoPreview}
                  alt="Logomarca"
                  style={{ width: 96, height: 96, objectFit: 'contain', border: '1px solid #f0f0f0', borderRadius: 8 }}
                />
                <Button
                  onClick={() => {
                    setLogoPreview(undefined);
                    form.setFieldsValue({ Logomarca: undefined });
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : null}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmpresasModal;
