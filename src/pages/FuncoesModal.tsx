import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Form, Input, Modal, Select } from 'antd';
import type { Funcao } from './Funcoes.tsx';
import { useTenant } from '../contexts/TenantContext';

interface FuncoesModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Partial<Funcao>;
  onCancel: () => void;
  onSave: (data: Omit<Funcao, 'IdFuncao'> & Partial<Pick<Funcao, 'IdFuncao'>>) => void;
}

const apiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  return String(env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');
};

const authHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const isExecutiveAuth = () => String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase() === 'executive';

type DepartamentoApi = {
  IdDepartamento: number;
  Departamento: string;
};

const FuncoesModal: React.FC<FuncoesModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant } = useTenant();
  const { message } = AntdApp.useApp();
  const [departamentos, setDepartamentos] = useState<DepartamentoApi[]>([]);

  const tenantQuery =
    isExecutiveAuth() && currentTenant?.id && currentTenant.id !== 0 ? `?tenant_id=${currentTenant.id}` : '';

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      IdFuncao: initialData?.IdFuncao,
      Funcao: initialData?.Funcao ?? '',
      Departamento: initialData?.Departamento ?? undefined,
      Descricao: initialData?.Descricao ?? undefined,
    });
  }, [open, initialData, form]);

  useEffect(() => {
    if (!open) return;
    const fetchDepartamentos = async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/departamentos${tenantQuery}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as DepartamentoApi[];
        setDepartamentos(Array.isArray(json) ? json : []);
      } catch {
        setDepartamentos([]);
        message.error('Falha ao carregar departamentos');
      }
    };
    fetchDepartamentos();
  }, [open, tenantQuery, message]);

  const departamentoOptions = useMemo(() => {
    const base = departamentos
      .map((d) => String(d.Departamento || '').trim())
      .filter(Boolean)
      .map((d) => ({ value: d, label: d }));
    const current = String(initialData?.Departamento ?? '').trim();
    if (current && !base.some((o) => o.value === current)) {
      return [{ value: current, label: current }, ...base];
    }
    return base;
  }, [departamentos, initialData?.Departamento]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        IdFuncao: values.IdFuncao ? Number(values.IdFuncao) : undefined,
        Funcao: String(values.Funcao ?? ''),
        Departamento: String(values.Departamento ?? ''),
        Descricao: values.Descricao ? String(values.Descricao) : undefined,
      });
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Nova Função' : 'Editar Função'}
      okText={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelText="Cancelar"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => form.resetFields()}
      destroyOnHidden
      width={820}
    >
      <Form form={form} layout="vertical">
        {mode === 'edit' ? (
          <Form.Item name="IdFuncao" label="IdFuncao">
            <Input disabled />
          </Form.Item>
        ) : null}

        <Form.Item name="Funcao" label="Função" rules={[{ required: true, message: 'Informe a função' }]}>
          <Input placeholder="Ex.: Analista Financeiro" />
        </Form.Item>

        <Form.Item name="Departamento" label="Departamento" rules={[{ required: true, message: 'Selecione o departamento' }]}>
          <Select
            showSearch
            placeholder="Selecione o departamento"
            options={departamentoOptions}
            filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item name="Descricao" label="Descrição">
          <Input.TextArea rows={4} placeholder="Descrição da função" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FuncoesModal;
