import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Row, Col, Card, Statistic, List, Tag, Button, Tabs, Space, Select, DatePicker } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CalendarOutlined, ProjectOutlined } from '@ant-design/icons';
import EChartsReact from 'echarts-for-react';
import { motion } from 'framer-motion';
import { useTenant } from '../contexts/TenantContext';
import { useTenantData } from '../hooks/useTenantData';
import { useTenantNavigation } from '../hooks/useTenantNavigation';

type ExecutivoApi = {
  IdExecutivo: number;
  Executivo: string;
  Funcao: string;
  Perfil: string;
  Empresa: string;
};

type ContaPagarApi = {
  IdContasPagar: number;
  Descricao: string;
  Credor?: string;
  TipoCobranca?: string;
  TipoPagamento?: string;
  Parcelas?: number;
  TipoCredor?: string;
  ValorOriginal?: number;
  ValorFinal?: number;
  DevedorIdExecutivo?: number;
  Devedor?: string;
  StatusPagamento?: string;
  Vencimento?: string;
  Empresa?: string;
};

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

const normalizeStatusPagamento = (value?: string) => String(value || '').trim().toUpperCase();

const parseISODate = (value?: string) => {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`);
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

const safeAddMonths = (base: Date, months: number) => {
  const y = base.getFullYear();
  const m = base.getMonth() + months;
  const day = base.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, lastDay));
};

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const financeCardBaseStyle: React.CSSProperties = {
  border: '0',
  overflow: 'hidden',
  boxShadow: '0 8px 22px rgba(0,0,0,0.08)',
};

const financeCardBodyStyle: React.CSSProperties = {
  padding: 12,
};

const financeTitleStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.92)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.2,
};

const financeSubStyle: React.CSSProperties = {
  marginTop: 6,
  color: 'rgba(255,255,255,0.85)',
  opacity: 1,
  fontSize: 12,
};

const financeValueStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 22,
  fontWeight: 800,
};

const HomePage: React.FC = () => {
  const { message } = AntdApp.useApp();
  const { currentTenant } = useTenant();
  const { meetings, tasks, loading } = useTenantData();
  const { navigateTo } = useTenantNavigation();
  const [executivos, setExecutivos] = useState<ExecutivoApi[]>([]);
  const [loadingExecutivos, setLoadingExecutivos] = useState(false);
  const [contasPagar, setContasPagar] = useState<ContaPagarApi[]>([]);
  const [loadingContasPagar, setLoadingContasPagar] = useState(false);
  const [filtroExecutivo, setFiltroExecutivo] = useState<string | undefined>(undefined);
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<string | undefined>(undefined);
  const [filtroTipoCobranca, setFiltroTipoCobranca] = useState<string | undefined>(undefined);
  const [filtroCredor, setFiltroCredor] = useState<string | undefined>(undefined);
  const [filtroTipoCredor, setFiltroTipoCredor] = useState<string | undefined>(undefined);
  const [filtroPeriodo, setFiltroPeriodo] = useState<[any, any] | null>(null);

  const empresaNome = currentTenant?.id === 0 ? '' : currentTenant?.name || '';

  const fetchExecutivos = useCallback(async () => {
    setLoadingExecutivos(true);
    try {
      const base = `${apiBaseUrl()}/api/executivos`;
      const url = empresaNome ? `${base}?empresa=${encodeURIComponent(empresaNome)}` : base;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ExecutivoApi[];
      setExecutivos(Array.isArray(json) ? json : []);
    } catch {
      setExecutivos([]);
      message.error('Falha ao carregar executivos');
    } finally {
      setLoadingExecutivos(false);
    }
  }, [empresaNome, message]);

  const fetchContasPagar = useCallback(async () => {
    setLoadingContasPagar(true);
    try {
      const base = `${apiBaseUrl()}/api/contas-pagar`;
      const url = empresaNome ? `${base}?empresa=${encodeURIComponent(empresaNome)}` : base;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ContaPagarApi[];
      setContasPagar(Array.isArray(json) ? json : []);
    } catch {
      setContasPagar([]);
      message.error('Falha ao carregar contas a pagar');
    } finally {
      setLoadingContasPagar(false);
    }
  }, [empresaNome, message]);

  useEffect(() => {
    fetchExecutivos();
    fetchContasPagar();
  }, [fetchExecutivos, fetchContasPagar, currentTenant?.id]);

  const getPieChartOption = (data: any[], title: string) => ({
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: '50%',
        data: data.map(item => ({ value: item.value, name: item.name })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  });

  const getBarChartOption = (data: any[], title: string, xName: string, yName: string) => ({
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xName]),
    },
    yAxis: {
      type: 'value',
      name: yName,
    },
    series: [
      {
        name: yName,
        type: 'bar',
        data: data.map(item => item.value),
      },
    ],
  });

  const getStackedBarOption = (
    categories: string[],
    title: string,
    series: Array<{ name: string; values: number[] }>
  ) => ({
    title: { text: title, left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 30 },
    grid: { left: 40, right: 16, bottom: 32, top: 72, containLabel: true },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      data: s.values,
    })),
  });

  const getLineOption = (labels: string[], title: string, values: number[]) => ({
    title: { text: title, left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, bottom: 32, top: 72, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [
      {
        name: title,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.18 },
        data: values,
      },
    ],
  });

  // Mock data for dashboard stats
  const dashboardStats = [
    { title: 'Reuniões Agendadas (Hoje)', value: meetings.length, suffix: 'reuniões' },
    { title: 'Tarefas Pendentes (Alta Prioridade)', value: tasks.filter(t => t.priority === 'Alta').length, suffix: 'tarefas' },
    { title: 'Executivos', value: executivos.length, suffix: 'executivos' },
    { title: 'Tarefas Concluídas', value: tasks.filter(t => t.priority === 'Alta').length, suffix: 'tarefas' },
  ];

  // Mock data for communication channels
  const communicationChannels = [
    { value: 45, name: 'E-mails (Interno)' },
    { value: 30, name: 'E-mails (Externo)' },
    { value: 15, name: 'Mensagens Instantâneas' },
    { value: 10, name: 'Telefone' },
  ];

  // Mock data for document approval status
  const documentApprovalStatus = [
    { value: 7, name: 'Aguardando' },
    { value: 12, name: 'Aprovados (Hoje)' },
    { value: 3, name: 'Rejeitados (Hoje)' },
  ];


  // Mock data for executive interaction frequency
  const executiveInteractionFrequency = executivos.map((exec, index) => ({
    name: exec.Executivo,
    value: (index + 1) * 2,
  }));

  const executivosPreview = useMemo(() => executivos.slice(0, 5), [executivos]);

  const contasPagarFiltradas = useMemo(() => {
    const start = filtroPeriodo?.[0]?.toDate?.() ? (filtroPeriodo?.[0]?.toDate?.() as Date) : null;
    const end = filtroPeriodo?.[1]?.toDate?.() ? (filtroPeriodo?.[1]?.toDate?.() as Date) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return contasPagar.filter((r) => {
      if (filtroExecutivo && String(r.Devedor || '').trim() !== filtroExecutivo) return false;
      if (filtroStatusPagamento && normalizeStatusPagamento(r.StatusPagamento) !== filtroStatusPagamento) return false;
      if (filtroTipoCobranca && String(r.TipoCobranca || '').trim() !== filtroTipoCobranca) return false;
      if (filtroCredor && String(r.Credor || '').trim() !== filtroCredor) return false;
      if (filtroTipoCredor && String(r.TipoCredor || '').trim() !== filtroTipoCredor) return false;
      if (start || end) {
        const d = parseISODate(r.Vencimento);
        if (!d) return false;
        const t = d.getTime();
        if (start && t < start.getTime()) return false;
        if (end && t > end.getTime()) return false;
      }
      return true;
    });
  }, [contasPagar, filtroCredor, filtroExecutivo, filtroPeriodo, filtroStatusPagamento, filtroTipoCobranca, filtroTipoCredor]);

  const filtroOptions = useMemo(() => {
    const uniq = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      executivos: uniq(contasPagar.map((r) => String(r.Devedor || '').trim())),
      tiposCobranca: uniq(contasPagar.map((r) => String(r.TipoCobranca || '').trim())),
      credores: uniq(contasPagar.map((r) => String(r.Credor || '').trim())),
      tiposCredor: uniq(contasPagar.map((r) => String(r.TipoCredor || '').trim())),
      statusPagamento: uniq(contasPagar.map((r) => normalizeStatusPagamento(r.StatusPagamento))),
    };
  }, [contasPagar]);

  const buildFinanceiroResumo = useCallback((rows: ContaPagarApi[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPaid = (s: string) => s === 'PAGO';
    const isOpen = (s: string) => s === 'ABERTO';

    const sumValue = (list: ContaPagarApi[]) =>
      list.reduce((acc, r) => acc + Number(r.ValorFinal ?? r.ValorOriginal ?? 0), 0);

    const openRows = rows.filter((r) => isOpen(normalizeStatusPagamento(r.StatusPagamento)));
    const unpaidRows = rows.filter((r) => !isPaid(normalizeStatusPagamento(r.StatusPagamento)));
    const overdueRows = unpaidRows.filter((r) => {
      const d = parseISODate(r.Vencimento);
      return d ? d.getTime() < today.getTime() : false;
    });

    const parceladasRows = unpaidRows.filter((r) => Math.max(1, Number(r.Parcelas || 1)) > 1);

    const parcelasFuturasQtd = parceladasRows.reduce((acc, r) => {
      const parcelas = Math.max(1, Number(r.Parcelas || 1));
      const venc = parseISODate(r.Vencimento);
      if (!venc) return acc + parcelas;
      let vencidas = 0;
      for (let i = 0; i < parcelas; i += 1) {
        const due = safeAddMonths(venc, i);
        if (due.getTime() < today.getTime()) vencidas += 1;
        else break;
      }
      const futuras = Math.max(parcelas - vencidas, 0);
      return acc + futuras;
    }, 0);

    const parcelasFuturasValor = parceladasRows.reduce((acc, r) => {
      const parcelas = Math.max(1, Number(r.Parcelas || 1));
      const venc = parseISODate(r.Vencimento);
      const parcelaValor = Number(r.ValorFinal ?? r.ValorOriginal ?? 0);
      if (!venc) return acc + parcelaValor * parcelas;
      let vencidas = 0;
      for (let i = 0; i < parcelas; i += 1) {
        const due = safeAddMonths(venc, i);
        if (due.getTime() < today.getTime()) vencidas += 1;
        else break;
      }
      const futuras = Math.max(parcelas - vencidas, 0);
      return acc + parcelaValor * futuras;
    }, 0);

    const totals = {
      abertoValor: sumValue(openRows),
      abertoQtd: openRows.length,
      vencidasValor: sumValue(overdueRows),
      vencidasQtd: overdueRows.length,
      parceladasValor: parcelasFuturasValor,
      parceladasQtd: parcelasFuturasQtd,
      pagoValor: sumValue(rows.filter((r) => isPaid(normalizeStatusPagamento(r.StatusPagamento)))),
      pagoQtd: rows.filter((r) => isPaid(normalizeStatusPagamento(r.StatusPagamento))).length,
      totalValor: sumValue(rows),
      totalQtd: rows.length,
    };

    const groupSumBy = (keyFn: (r: ContaPagarApi) => string) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = keyFn(r);
        const prev = map.get(k) || 0;
        map.set(k, prev + Number(r.ValorFinal ?? r.ValorOriginal ?? 0));
      }
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .filter((x) => x.name !== 'NÃO INFORMADO')
        .sort((a, b) => b.value - a.value);
    };

    const byTipoPagamento = groupSumBy((r) => String(r.TipoPagamento || 'NÃO INFORMADO').trim().toUpperCase() || 'NÃO INFORMADO');
    const byTipoCobranca = groupSumBy((r) => String(r.TipoCobranca || 'NÃO INFORMADO').trim().toUpperCase() || 'NÃO INFORMADO');

    const byExecutiveMap = new Map<
      string,
      { aberto: number; vencido: number; parcial: number; pago: number }
    >();
    for (const r of rows) {
      const exec = String(r.Devedor || 'NÃO INFORMADO').trim() || 'NÃO INFORMADO';
      const status = normalizeStatusPagamento(r.StatusPagamento);
      const value = Number(r.ValorFinal ?? r.ValorOriginal ?? 0);
      const d = parseISODate(r.Vencimento);
      const isOverdue = d ? d.getTime() < today.getTime() : false;
      const cur = byExecutiveMap.get(exec) || { aberto: 0, vencido: 0, parcial: 0, pago: 0 };
      if (status === 'PAGO') cur.pago += value;
      else if (status.includes('PARCIAL')) cur.parcial += value;
      else if (status === 'ABERTO' && isOverdue) cur.vencido += value;
      else if (status === 'ABERTO') cur.aberto += value;
      else if (isOverdue) cur.vencido += value;
      else cur.aberto += value;
      byExecutiveMap.set(exec, cur);
    }

    const byExecutive = [...byExecutiveMap.entries()]
      .map(([name, v]) => ({ name, ...v, total: v.aberto + v.vencido + v.parcial + v.pago }))
      .filter((x) => x.name !== 'NÃO INFORMADO')
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const seriesExecutivos = {
      categories: byExecutive.map((x) => x.name),
      series: [
        { name: 'Aberto', values: byExecutive.map((x) => x.aberto) },
        { name: 'Vencido', values: byExecutive.map((x) => x.vencido) },
        { name: 'Em Andamento', values: byExecutive.map((x) => x.parcial) },
        { name: 'Pago', values: byExecutive.map((x) => x.pago) },
      ],
    };

    const byDayMap = new Map<string, number>();
    for (const r of rows) {
      const d = parseISODate(r.Vencimento);
      if (!d) continue;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const k = `${dd}/${mm}/${yyyy}`;
      byDayMap.set(k, (byDayMap.get(k) || 0) + Number(r.ValorFinal ?? r.ValorOriginal ?? 0));
    }
    const timeline = [...byDayMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const [da, ma, ya] = a.label.split('/').map(Number);
        const [db, mb, yb] = b.label.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      })
      .slice(-14);

    return {
      totals,
      byTipoPagamento,
      byTipoCobranca,
      seriesExecutivos,
      timelineLabels: timeline.map((x) => x.label),
      timelineValues: timeline.map((x) => x.value),
    };
  }, []);

  const financeiroResumoGeral = useMemo(() => buildFinanceiroResumo(contasPagar), [buildFinanceiroResumo, contasPagar]);
  const financeiroResumo = useMemo(() => buildFinanceiroResumo(contasPagarFiltradas), [buildFinanceiroResumo, contasPagarFiltradas]);

  const motionCard = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

  const principalContent = (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {dashboardStats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <motion.div {...motionCard}>
              <Card>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  suffix={stat.suffix}
                  valueStyle={{ color: stat.title.includes('Pendentes') ? '#cf1322' : '#3f8600' }}
                  prefix={stat.title.includes('Pendentes') ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Próximas Reuniões">
              <List
                itemLayout="horizontal"
                dataSource={meetings.slice(0, 3)}
                loading={loading}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<a href="#">{item.title}</a>}
                      description={`Com: ${item.executive} | Horário: ${item.time}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Tarefas Urgentes/Próximas">
              <List
                itemLayout="horizontal"
                dataSource={tasks.slice(0, 3)}
                loading={loading}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<a href="#">{item.title}</a>}
                      description={
                        <>
                          <span>
                            Para: {item.executive || 'Não atribuído'} | Vencimento: {item.dueDate} |{' '}
                          </span>
                          <Tag color={item.priority === 'Alta' ? 'red' : item.priority === 'Média' ? 'orange' : 'green'}>
                            {item.priority}
                          </Tag>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <motion.div {...motionCard}>
            <Card
              title="Executivos"
              extra={
                <Button type="link" onClick={() => navigateTo('/cadastros/executivos')}>
                  Ver todos
                </Button>
              }
            >
              <List
                itemLayout="horizontal"
                dataSource={executivosPreview}
                loading={loadingExecutivos}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.Executivo}
                      description={`${item.Funcao} | ${item.Perfil} | ${item.Empresa}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={8}>
          <motion.div {...motionCard}>
            <Card
              title="Contas a Pagar (Aberto)"
              extra={
                <Button type="link" onClick={() => navigateTo('/financial/contas-a-pagar')}>
                  Abrir
                </Button>
              }
              loading={loadingContasPagar}
            >
              <Statistic
                title="Total em aberto"
                value={financeiroResumoGeral.totals.abertoValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={{ color: '#cf1322' }}
              />
              <div style={{ marginTop: 8, opacity: 0.75 }}>
                {financeiroResumoGeral.totals.abertoQtd} contas em aberto
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={8}>
          <motion.div {...motionCard}>
            <Card title="Frequência de Interação por Executivo">
              <EChartsReact
                option={getBarChartOption(executiveInteractionFrequency, 'Interação Executiva', 'name', 'Interações')}
                style={{ height: 300 }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Canais de Comunicação Utilizados">
              <EChartsReact option={getPieChartOption(communicationChannels, 'Canais de Comunicação')} style={{ height: 300 }} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Status de Aprovação de Documentos">
              <EChartsReact option={getPieChartOption(documentApprovalStatus, 'Status de Documentos')} style={{ height: 300 }} />
            </Card>
          </motion.div>
        </Col>
      </Row>
    </>
  );

  const financeiroContent = (
    <>
      <motion.div {...motionCard}>
        <Card style={{ marginBottom: 16 }} title="Filtros">
          <Space wrap size={12} style={{ width: '100%' }}>
            <Select
              allowClear
              showSearch
              placeholder="Executivo"
              style={{ width: 260 }}
              options={filtroOptions.executivos.map((v) => ({ value: v, label: v }))}
              value={filtroExecutivo}
              onChange={(v) => setFiltroExecutivo(v)}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              value={filtroPeriodo as any}
              onChange={(v) => {
                const next = Array.isArray(v) && v[0] && v[1] ? ([v[0], v[1]] as any) : null;
                setFiltroPeriodo(next);
              }}
            />
            <Select
              allowClear
              showSearch
              placeholder="Tipo de Cobrança"
              style={{ width: 220 }}
              options={filtroOptions.tiposCobranca.map((v) => ({ value: v, label: v }))}
              value={filtroTipoCobranca}
              onChange={(v) => setFiltroTipoCobranca(v)}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <Select
              allowClear
              showSearch
              placeholder="Credor"
              style={{ width: 220 }}
              options={filtroOptions.credores.map((v) => ({ value: v, label: v }))}
              value={filtroCredor}
              onChange={(v) => setFiltroCredor(v)}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <Select
              allowClear
              showSearch
              placeholder="Tipo de Credor"
              style={{ width: 220 }}
              options={filtroOptions.tiposCredor.map((v) => ({ value: v, label: v }))}
              value={filtroTipoCredor}
              onChange={(v) => setFiltroTipoCredor(v)}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <Select
              allowClear
              showSearch
              placeholder="Status de Pagamento"
              style={{ width: 220 }}
              options={filtroOptions.statusPagamento.map((v) => ({ value: v, label: v }))}
              value={filtroStatusPagamento}
              onChange={(v) => setFiltroStatusPagamento(v)}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <Button
              onClick={() => {
                setFiltroExecutivo(undefined);
                setFiltroStatusPagamento(undefined);
                setFiltroTipoCobranca(undefined);
                setFiltroCredor(undefined);
                setFiltroTipoCredor(undefined);
                setFiltroPeriodo(null);
              }}
            >
              Limpar filtros
            </Button>
            <Button onClick={fetchContasPagar}>Atualizar</Button>
          </Space>
        </Card>
      </motion.div>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col flex="20%" style={{ minWidth: 220 }}>
          <motion.div {...motionCard}>
            <Card
              loading={loadingContasPagar}
              size="small"
              styles={{ body: financeCardBodyStyle }}
              style={{
                ...financeCardBaseStyle,
                background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
              }}
            >
              <Statistic
                title={<span style={financeTitleStyle}>CONTAS A PAGAR (ABERTO)</span>}
                value={financeiroResumo.totals.abertoValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={financeValueStyle}
              />
              <div style={financeSubStyle}>{financeiroResumo.totals.abertoQtd} contas</div>
            </Card>
          </motion.div>
        </Col>
        <Col flex="20%" style={{ minWidth: 220 }}>
          <motion.div {...motionCard}>
            <Card
              loading={loadingContasPagar}
              size="small"
              styles={{ body: financeCardBodyStyle }}
              style={{
                ...financeCardBaseStyle,
                background: 'linear-gradient(135deg, #faad14 0%, #fa8c16 100%)',
              }}
            >
              <Statistic
                title={<span style={financeTitleStyle}>CONTAS VENCIDAS</span>}
                value={financeiroResumo.totals.vencidasValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={financeValueStyle}
              />
              <div style={financeSubStyle}>{financeiroResumo.totals.vencidasQtd} contas</div>
            </Card>
          </motion.div>
        </Col>
        <Col flex="20%" style={{ minWidth: 220 }}>
          <motion.div {...motionCard}>
            <Card
              loading={loadingContasPagar}
              size="small"
              styles={{ body: financeCardBodyStyle }}
              style={{
                ...financeCardBaseStyle,
                background: 'linear-gradient(135deg, #1677ff 0%, #10239e 100%)',
              }}
            >
              <Statistic
                title={<span style={financeTitleStyle}>CONTAS PARCELADAS</span>}
                value={financeiroResumo.totals.parceladasValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={financeValueStyle}
              />
              <div style={financeSubStyle}>{financeiroResumo.totals.parceladasQtd} parcelas a vencer</div>
            </Card>
          </motion.div>
        </Col>
        <Col flex="20%" style={{ minWidth: 220 }}>
          <motion.div {...motionCard}>
            <Card
              loading={loadingContasPagar}
              size="small"
              styles={{ body: financeCardBodyStyle }}
              style={{
                ...financeCardBaseStyle,
                background: 'linear-gradient(135deg, #52c41a 0%, #237804 100%)',
              }}
            >
              <Statistic
                title={<span style={financeTitleStyle}>CONTAS PAGAS</span>}
                value={financeiroResumo.totals.pagoValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={financeValueStyle}
              />
              <div style={financeSubStyle}>{financeiroResumo.totals.pagoQtd} contas</div>
            </Card>
          </motion.div>
        </Col>
        <Col flex="20%" style={{ minWidth: 220 }}>
          <motion.div {...motionCard}>
            <Card
              loading={loadingContasPagar}
              size="small"
              styles={{ body: financeCardBodyStyle }}
              style={{
                ...financeCardBaseStyle,
                background: 'linear-gradient(135deg, #9254de 0%, #531dab 100%)',
              }}
            >
              <Statistic
                title={<span style={financeTitleStyle}>CONTAS (TOTAL)</span>}
                value={financeiroResumo.totals.totalValor}
                formatter={(v) => brl(Number(v || 0))}
                valueStyle={financeValueStyle}
              />
              <div style={financeSubStyle}>{financeiroResumo.totals.totalQtd} contas</div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card
              title="Executivos x Contas (Top 10, por valor)"
              extra={
                <Button type="link" onClick={() => navigateTo('/financial/contas-a-pagar')}>
                  Ver lista
                </Button>
              }
              loading={loadingContasPagar}
            >
              <EChartsReact
                option={getStackedBarOption(
                  financeiroResumo.seriesExecutivos.categories,
                  'Distribuição por Executivo',
                  financeiroResumo.seriesExecutivos.series
                )}
                style={{ height: 340 }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Pagamentos por vencimento (últimos 14 vencimentos)" loading={loadingContasPagar}>
              <EChartsReact
                option={getLineOption(financeiroResumo.timelineLabels, 'Valor por Vencimento', financeiroResumo.timelineValues)}
                style={{ height: 340 }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Tipos de Pagamento (por valor)" loading={loadingContasPagar}>
              <EChartsReact option={getPieChartOption(financeiroResumo.byTipoPagamento, 'Tipos de Pagamento')} style={{ height: 320 }} />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} md={12}>
          <motion.div {...motionCard}>
            <Card title="Tipos de Cobrança (por valor)" loading={loadingContasPagar}>
              <EChartsReact option={getPieChartOption(financeiroResumo.byTipoCobranca, 'Tipos de Cobrança')} style={{ height: 320 }} />
            </Card>
          </motion.div>
        </Col>
      </Row>
    </>
  );

  const agendaContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<CalendarOutlined />} onClick={() => navigateTo('/agenda')}>
          Abrir Agenda
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Agenda (próximas reuniões)">
            <List
              itemLayout="horizontal"
              dataSource={meetings}
              loading={loading}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.title} description={`Com: ${item.executive} | Horário: ${item.time}`} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const tarefasContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<ProjectOutlined />} onClick={() => navigateTo('/tasks')}>
          Abrir Tarefas
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Tarefas">
            <List
              itemLayout="horizontal"
              dataSource={tasks}
              loading={loading}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <>
                        <span>
                          Para: {item.executive || 'Não atribuído'} | Vencimento: {item.dueDate} |{' '}
                        </span>
                        <Tag color={item.priority === 'Alta' ? 'red' : item.priority === 'Média' ? 'orange' : 'green'}>
                          {item.priority}
                        </Tag>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <div>
      <Tabs
        defaultActiveKey="principal"
        items={[
          { key: 'principal', label: 'DASHBOARD PRINCIPAL', children: principalContent },
          { key: 'agenda', label: 'DASHBOARD - AGENDA', children: agendaContent },
          { key: 'tarefas', label: 'DASHBOARD - TAREFAS', children: tarefasContent },
          { key: 'financeiro', label: 'DASHBOARD - FINANCEIRO', children: financeiroContent },
        ]}
      />
    </div>
  );
};

export default HomePage;
