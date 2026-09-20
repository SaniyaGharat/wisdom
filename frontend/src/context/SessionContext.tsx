import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Api } from '../api/endpoints';
import type { Client, Supplier, HealthResponse } from '../api/types';

export type UserRole = 'client' | 'supplier' | 'admin';

interface SessionContextValue {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  activeSupplierId: string | null;
  setActiveSupplierId: (id: string | null) => void;
  clients: Client[];
  suppliers: Supplier[];
  activeClient: Client | null;
  activeSupplier: Supplier | null;
  isLoadingSessions: boolean;
  refreshSessions: () => Promise<void>;
  health: HealthResponse | null;
  refreshHealth: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const CLIENT_STORAGE_KEY = 'matchiq_active_client_id';
const SUPPLIER_STORAGE_KEY = 'matchiq_active_supplier_id';
const ROLE_STORAGE_KEY = 'matchiq_active_role';

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(ROLE_STORAGE_KEY) as UserRole) || 'client';
  });

  const [activeClientId, setActiveClientIdState] = useState<string | null>(() => {
    return localStorage.getItem(CLIENT_STORAGE_KEY) || null;
  });

  const [activeSupplierId, setActiveSupplierIdState] = useState<string | null>(() => {
    return localStorage.getItem(SUPPLIER_STORAGE_KEY) || null;
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  };

  const setActiveClientId = (id: string | null) => {
    setActiveClientIdState(id);
    if (id) {
      localStorage.setItem(CLIENT_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(CLIENT_STORAGE_KEY);
    }
  };

  const setActiveSupplierId = (id: string | null) => {
    setActiveSupplierIdState(id);
    if (id) {
      localStorage.setItem(SUPPLIER_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SUPPLIER_STORAGE_KEY);
    }
  };

  const refreshHealth = useCallback(async () => {
    try {
      const data = await Api.getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const [clientsRes, suppliersRes] = await Promise.all([
        Api.clients.list({ limit: 100 }),
        Api.suppliers.list({ limit: 100 }),
      ]);

      const clientList = clientsRes.items || [];
      const supplierList = suppliersRes.items || [];
      setClients(clientList);
      setSuppliers(supplierList);

      // If activeClientId is not set or invalid, select the first available client
      setActiveClientIdState((currentId) => {
        if (currentId && clientList.some((c) => c.id === currentId)) {
          return currentId;
        }
        if (clientList.length > 0) {
          localStorage.setItem(CLIENT_STORAGE_KEY, clientList[0].id);
          return clientList[0].id;
        }
        return null;
      });

      // If activeSupplierId is not set or invalid, select the first available supplier
      setActiveSupplierIdState((currentId) => {
        if (currentId && supplierList.some((s) => s.id === currentId)) {
          return currentId;
        }
        if (supplierList.length > 0) {
          localStorage.setItem(SUPPLIER_STORAGE_KEY, supplierList[0].id);
          return supplierList[0].id;
        }
        return null;
      });
    } catch (err) {
      console.warn('Could not fetch session items:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    refreshHealth();
    const interval = setInterval(refreshHealth, 30000);
    return () => clearInterval(interval);
  }, [refreshSessions, refreshHealth]);

  const activeClient = clients.find((c) => c.id === activeClientId) || null;
  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId) || null;

  return (
    <SessionContext.Provider
      value={{
        activeRole,
        setActiveRole,
        activeClientId,
        setActiveClientId,
        activeSupplierId,
        setActiveSupplierId,
        clients,
        suppliers,
        activeClient,
        activeSupplier,
        isLoadingSessions,
        refreshSessions,
        health,
        refreshHealth,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
