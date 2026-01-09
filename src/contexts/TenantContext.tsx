import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define the tenant type
export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  logoUrl?: string;
  isActive: boolean;
}

type TenantFromApi = {
  IdTenant: number;
  Tenant: string;
  Slug: string;
};

const EXECUTIVE_TENANT_ID = 0;
const EXECUTIVE_TENANT: Tenant = {
  id: EXECUTIVE_TENANT_ID,
  name: 'EXECUTIVE',
  subdomain: 'executive',
  isActive: true,
};

type AuthSnapshot = {
  token: string;
  tenantSlug: string;
  tenantId: number;
  tenantName: string;
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

const readAuthSnapshot = (): AuthSnapshot => {
  const token = String(localStorage.getItem('auth_token') || '');
  const tenantSlug = String(localStorage.getItem('auth_tenant_slug') || '');
  const tenantId = Number(localStorage.getItem('auth_tenant_id') || '');
  const tenantName = String(localStorage.getItem('auth_tenant_name') || '');
  return { token, tenantSlug, tenantId, tenantName };
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

const withExecutiveTenant = (tenants: Tenant[]): Tenant[] => {
  const base = tenants.filter((t) => t.id !== EXECUTIVE_TENANT_ID);
  return [EXECUTIVE_TENANT, ...base];
};

const tenantsFromApiToTenants = (rows: TenantFromApi[]): Tenant[] => {
  return rows
    .filter((t) => String(t?.Slug || '').toLowerCase() !== 'executive')
    .map((t) => ({
      id: Number(t.IdTenant),
      name: String(t.Tenant || ''),
      subdomain: String(t.Slug || ''),
      isActive: true,
    }))
    .filter((t) => Number.isFinite(t.id) && t.id > 0 && Boolean(String(t.name || '').trim()));
};

// Create the provider component
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(() => readAuthSnapshot());
  const [reloadKey, setReloadKey] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>(() => [EXECUTIVE_TENANT]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => EXECUTIVE_TENANT);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const onAuthChanged = () => {
      setAuthSnapshot(readAuthSnapshot());
    };
    window.addEventListener('executive-auth-changed', onAuthChanged);
    return () => {
      window.removeEventListener('executive-auth-changed', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = authSnapshot.token;
      if (!token) {
        setTenants([EXECUTIVE_TENANT]);
        setCurrentTenant(EXECUTIVE_TENANT);
        return;
      }

      if (String(authSnapshot.tenantSlug || '').toLowerCase() !== 'executive') {
        const tid = Number(authSnapshot.tenantId);
        if (!Number.isFinite(tid) || tid <= 0) return;
        const name =
          String(authSnapshot.tenantName || '').trim() ||
          String(authSnapshot.tenantSlug || '').trim().toUpperCase() ||
          `TENANT ${tid}`;
        const tenant: Tenant = { id: tid, name, subdomain: String(authSnapshot.tenantSlug || '').trim().toLowerCase(), isActive: true };
        setTenants([tenant]);
        setCurrentTenant(tenant);
        localStorage.setItem('currentTenantId', String(tenant.id));
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl()}/api/tenants`, { headers: authHeaders() });
        if (!res.ok) return;
        const json = (await res.json()) as unknown;
        const rows = Array.isArray(json) ? (json as TenantFromApi[]) : [];
        const apiTenants = tenantsFromApiToTenants(rows);
        const nextTenants = withExecutiveTenant(apiTenants);
        if (cancelled) return;
        setTenants(nextTenants);
        setCurrentTenant(() => {
          const savedTenantIdRaw = localStorage.getItem('currentTenantId');
          const savedTenantId = savedTenantIdRaw ? Number(savedTenantIdRaw) : NaN;
          if (Number.isFinite(savedTenantId)) {
            const saved = nextTenants.find((t) => t.id === savedTenantId);
            if (saved) return saved;
          }
          return nextTenants[0] ?? null;
        });
      } catch {
        return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authSnapshot.token, authSnapshot.tenantSlug, authSnapshot.tenantId, authSnapshot.tenantName, reloadKey]);

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

  const switchTenant = useCallback((tenantId: number) => {
    if (currentTenant?.id === tenantId) return;
    setIsLoading(true);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(false);
    }
  }, [currentTenant?.id, tenants]);

  const addTenant = useCallback((tenant: Tenant) => {
    setTenants(prev => [...prev, tenant]);
  }, []);

  const removeTenant = useCallback((tenantId: number) => {
    if (tenantId === EXECUTIVE_TENANT_ID) return;
    setTenants(prev => {
      const next = prev.filter(t => t.id !== tenantId);
      if (currentTenant && currentTenant.id === tenantId) {
        setCurrentTenant(next[0] ?? null);
      }
      return next;
    });
  }, [currentTenant]);

  const refreshTenantData = useCallback(() => {
    const snap = readAuthSnapshot();
    setAuthSnapshot(snap);
    if (!snap.token) {
      setTenants([EXECUTIVE_TENANT]);
      setCurrentTenant(EXECUTIVE_TENANT);
    }
    setReloadKey((v) => v + 1);
  }, []);

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
