import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the tenant type
export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  logoUrl?: string;
  isActive: boolean;
}

type EmpresaFromStorage = {
  IdEmpresas: number;
  CNPJ: string;
  RazaoSocial: string;
  NomeFantasia: string;
  Logomarca?: string;
};

// Define the context type
interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantId: number) => void;
  addTenant: (tenant: Tenant) => void;
  removeTenant: (tenantId: number) => void;
  isLoading: boolean;
  refreshTenantData: () => void;
}

// Create the context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

const defaultEmpresas: EmpresaFromStorage[] = [
  {
    IdEmpresas: 1,
    CNPJ: '04959557000105',
    RazaoSocial: 'ENGECO - ENGENHARIA E CONSTRUÇÃO LTDA.',
    NomeFantasia: 'ENGECO',
  },
];

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const loadEmpresas = (): EmpresaFromStorage[] => {
  try {
    const raw = localStorage.getItem('empresas_list');
    const list = raw ? (JSON.parse(raw) as EmpresaFromStorage[]) : [];
    if (Array.isArray(list) && list.length > 0) return list;
    localStorage.setItem('empresas_list', JSON.stringify(defaultEmpresas));
    return defaultEmpresas;
  } catch {
    return defaultEmpresas;
  }
};

const empresasToTenants = (empresas: EmpresaFromStorage[]): Tenant[] => {
  return empresas
    .filter((e) => Number.isFinite(Number(e.IdEmpresas)))
    .map((e) => {
      const name = e.NomeFantasia || e.RazaoSocial || `Empresa ${e.IdEmpresas}`;
      return {
        id: Number(e.IdEmpresas),
        name,
        subdomain: slugify(name) || `empresa-${e.IdEmpresas}`,
        logoUrl: e.Logomarca,
        isActive: true,
      };
    });
};

// Create the provider component
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => empresasToTenants(loadEmpresas()));
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    const list = empresasToTenants(loadEmpresas());
    return list[0] || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load tenant from localStorage on initial load
  useEffect(() => {
    const savedTenantId = localStorage.getItem('currentTenantId');
    if (savedTenantId) {
      const tenantId = Number(savedTenantId);
      if (!Number.isFinite(tenantId)) return;
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;
      setCurrentTenant((prev) => (prev?.id === tenant.id ? prev : tenant));
    }
  }, [tenants]);

  // Save tenant to localStorage when it changes
  useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('currentTenantId', currentTenant.id.toString());
    }
  }, [currentTenant]);

  const switchTenant = (tenantId: number) => {
    if (currentTenant?.id === tenantId) return;
    setIsLoading(true);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      // In a real app, you would also refresh the data for the new tenant
      console.log(`Switched to tenant: ${tenant.name}`);
      // Simulate API call delay
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(false);
    }
  };

  const addTenant = (tenant: Tenant) => {
    setTenants(prev => [...prev, tenant]);
  };

  const removeTenant = (tenantId: number) => {
    setTenants(prev => {
      const next = prev.filter(t => t.id !== tenantId);
      if (currentTenant && currentTenant.id === tenantId) {
        setCurrentTenant(next[0] ?? null);
      }
      return next;
    });
  };

  const refreshTenantData = () => {
    const nextTenants = empresasToTenants(loadEmpresas());
    setTenants(nextTenants);
    setCurrentTenant((prev) => {
      if (!prev) return nextTenants[0] ?? null;
      const found = nextTenants.find((t) => t.id === prev.id);
      return found ?? nextTenants[0] ?? null;
    });
  };

  return (
    <TenantContext.Provider value={{ 
      currentTenant, 
      tenants, 
      switchTenant, 
      addTenant, 
      removeTenant,
      isLoading,
      refreshTenantData
    }}>
      {children}
    </TenantContext.Provider>
  );
};

// Create a custom hook to use the tenant context
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
