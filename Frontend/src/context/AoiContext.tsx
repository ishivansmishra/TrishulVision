import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type AoiState = {
  aoi: any | null;
  setAoi: (gj: any | null) => void;
  saveAoi: (name?: string) => Promise<string | null>;
  listAois: () => Promise<Array<{ id: string; name?: string; geometry: any }>>;
};

const Ctx = createContext<AoiState | null>(null);

export function AoiProvider({ children }: { children: React.ReactNode }) {
  const [aoi, setAoi] = useState<any | null>(null);
  const saveAoi = useCallback(async (name?: string) => {
    if (!aoi) return null;
    try {
      const res = await api.createAoi(name, aoi);
      return res.id;
    } catch { return null; }
  }, [aoi]);
  const listAois = useCallback(async () => {
    try { return await api.listAois(); } catch { return []; }
  }, []);
  const value = useMemo(() => ({ aoi, setAoi, saveAoi, listAois }), [aoi, saveAoi, listAois]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAoi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAoi must be used within AoiProvider');
  return ctx;
}
