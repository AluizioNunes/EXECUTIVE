import React, { useEffect, useMemo } from 'react';
import { AutoComplete, Modal, Form, Input, Select, Switch } from 'antd';
import { useTenant } from '../contexts/TenantContext';

interface UsuarioModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: any;
  onCancel: () => void;
  onSave: (data: any) => void;
}

type PessoaJuridicaFromStorage = {
  id: number;
  razaoSocial: string;
  nomeFantasia?: string;
  ativo?: boolean;
  empresaId?: number;
};

const tenantStorageKey = (tenantId: number | undefined, baseKey: string) =>
  tenantId ? `${tenantId}_${baseKey}` : baseKey;

const migrateToTenantKey = (tenantId: number | undefined, baseKey: string) => {
  if (!tenantId) return;
  try {
    const tenantKey = tenantStorageKey(tenantId, baseKey);
    const tenantRaw = localStorage.getItem(tenantKey);
    if (tenantRaw) return;
    const legacyRaw = localStorage.getItem(baseKey);
    if (!legacyRaw) return;
    localStorage.setItem(tenantKey, legacyRaw);
    localStorage.removeItem(baseKey);
  } catch {}
};

const loadPJOptions = (tenantId: number | undefined) => {
  migrateToTenantKey(tenantId, 'pj_list');
  try {
    const raw = localStorage.getItem(tenantStorageKey(tenantId, 'pj_list'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const rows = parsed as PessoaJuridicaFromStorage[];
    const normalized = rows
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        razaoSocial: String((p as any).razaoSocial ?? '').trim(),
        nomeFantasia: String((p as any).nomeFantasia ?? '').trim(),
        ativo: Boolean((p as any).ativo),
      }))
      .filter((p) => Boolean(p.razaoSocial));

    const active = normalized.filter((p) => p.ativo);
    const source = active.length ? active : normalized;

    const unique = new Map<string, { label: string; value: string }>();
    for (const p of source) {
      const value = p.razaoSocial;
      const label = p.nomeFantasia ? `${p.razaoSocial} (${p.nomeFantasia})` : p.razaoSocial;
      if (!unique.has(value)) unique.set(value, { value, label });
    }
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  } catch {
    return [];
  }
};

const UsuarioModal: React.FC<UsuarioModalProps> = ({ open, mode = 'create', initialData, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const isSuperadmin = useMemo(() => {
    const role = String(localStorage.getItem('auth_role') || '').toUpperCase();
    const tenantSlug = String(localStorage.getItem('auth_tenant_slug') || '').toLowerCase();
    return role === 'SUPERADMIN' && tenantSlug === 'executive';
  }, []);

  const pjOptions = useMemo(() => loadPJOptions(tenantId), [tenantId]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        Usuario: initialData?.Usuario ?? '',
        Nome: initialData?.Nome ?? '',
        Email: initialData?.Email ?? '',
        Celular: initialData?.Celular ?? '',
        Funcao: initialData?.Funcao ?? '',
        Perfil: initialData?.Perfil ?? '',
        Permissao: initialData?.Permissao ?? '',
        Role: initialData?.Role ?? '',
        TenantId: initialData?.TenantId ?? tenantId,
        Ativo: Number(initialData?.Ativo ?? 1) === 1,
        Senha: '',
      });
    }
  }, [open, initialData, form, tenantId]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleOk}
      okText={mode === 'edit' ? 'Salvar' : 'Criar'}
      cancelText="Cancelar"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="Usuario" label="Usuário" rules={[{ required: true, message: 'Informe o usuário' }]}>
          <Input placeholder="ex: ADMIN.JOAO" />
        </Form.Item>

        <Form.Item name="Nome" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
          <AutoComplete
            options={pjOptions}
            placeholder={pjOptions.length ? 'Digite ou selecione um nome' : 'Digite um nome'}
            filterOption={(input, option) => {
              const i = String(input ?? '').toLowerCase();
              const label = String((option as any)?.label ?? '').toLowerCase();
              const value = String((option as any)?.value ?? '').toLowerCase();
              return label.includes(i) || value.includes(i);
            }}
          >
            <Input />
          </AutoComplete>
        </Form.Item>

        <Form.Item name="Email" label="E-mail (Recuperação de senha)" rules={[{ type: 'email', message: 'Informe um e-mail válido' }]}>
          <Input placeholder="email@dominio.com" />
        </Form.Item>

        <Form.Item name="Celular" label="Celular">
          <Input placeholder="(11) 99999-9999" />
        </Form.Item>

        <Form.Item name="Funcao" label="Função">
          <Input placeholder="ex: Assistente Executivo" />
        </Form.Item>

        <Form.Item name="Perfil" label="Perfil">
          <Input placeholder="ex: Financeiro" />
        </Form.Item>

        <Form.Item name="Permissao" label="Permissão">
          <Input placeholder="ex: CONTAS_PAGAR,ATIVOS" />
        </Form.Item>

        <Form.Item name="Role" label="Role">
          <Select
            options={[
              { value: 'USER', label: 'USER' },
              { value: 'ADMIN', label: 'ADMIN' },
              { value: 'SUPERADMIN', label: 'SUPERADMIN' },
            ]}
            placeholder="Selecione"
            disabled={!isSuperadmin}
            allowClear
          />
        </Form.Item>

        <Form.Item name="TenantId" label="TenantId">
          <Input disabled={!isSuperadmin} />
        </Form.Item>

        <Form.Item
          name="Senha"
          label={mode === 'edit' ? 'Senha (opcional)' : 'Senha'}
          rules={mode === 'create' ? [{ required: true, message: 'Informe a senha' }] : []}
        >
          <Input.Password placeholder={mode === 'edit' ? 'Deixe em branco para manter' : 'Informe a senha'} />
        </Form.Item>

        <Form.Item name="Ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UsuarioModal;
