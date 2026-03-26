import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Consortium,
  ConsortiumDataContributionRow,
  ConsortiumDataPolicy,
  ConsortiumDataSummary,
  ConsortiumMember,
} from "@/data/consortiums-mock";
import { getInitialConsortiumCatalogState } from "@/data/consortiums-mock";
import type { ConfiguredProduct } from "@/data/data-products-mock";
import { getInitialProductsCatalogState } from "@/data/data-products-mock";

const STORAGE_KEY = "hcb_catalog_mock_v3";

type ConsortiumCatalogState = ReturnType<typeof getInitialConsortiumCatalogState>;

type PersistedCatalog = {
  consortiums: Consortium[];
  membersByConsortiumId: Record<string, ConsortiumMember[]>;
  contributionByConsortiumId: Record<string, ConsortiumDataContributionRow[]>;
  contributionSummaryByConsortiumId: Record<string, ConsortiumDataSummary>;
  products: ConfiguredProduct[];
};

export type AddConsortiumInput = {
  consortium: Omit<
    Consortium,
    "id" | "membersCount" | "dataVolume" | "status" | "dataPolicy"
  > & {
    dataPolicy: ConsortiumDataPolicy;
    status?: Consortium["status"];
    dataVolume?: string;
  };
  members: ConsortiumMember[];
  contributionSummary?: ConsortiumDataSummary;
};

export type UpdateConsortiumInput = {
  consortium: Partial<Consortium>;
  members: ConsortiumMember[];
  contributionSummary?: ConsortiumDataSummary;
};

interface CatalogMockContextValue extends ConsortiumCatalogState {
  products: ConfiguredProduct[];
  addConsortium: (input: AddConsortiumInput) => Consortium;
  updateConsortium: (id: string, input: UpdateConsortiumInput) => void;
  addProduct: (product: Omit<ConfiguredProduct, "id" | "lastUpdated">) => ConfiguredProduct;
  updateProduct: (id: string, product: Partial<ConfiguredProduct>) => void;
}

const CatalogMockContext = createContext<CatalogMockContextValue | null>(null);

function nextConsortiumId(consortiums: Consortium[]): string {
  let max = 0;
  consortiums.forEach((c) => {
    const m = /^CONS_(\d+)$/.exec(c.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `CONS_${String(max + 1).padStart(3, "0")}`;
}

function nextProductId(products: ConfiguredProduct[]): string {
  let max = 0;
  products.forEach((p) => {
    const m = /^PRD_(\d+)$/.exec(p.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `PRD_${String(max + 1).padStart(3, "0")}`;
}

function loadPersisted(): PersistedCatalog | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCatalog;
    if (!Array.isArray(parsed.consortiums) || !Array.isArray(parsed.products)) return null;
    if (!parsed.membersByConsortiumId || !parsed.contributionByConsortiumId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function initCatalog(): PersistedCatalog {
  const persisted = loadPersisted();
  if (persisted) return persisted;
  const c = getInitialConsortiumCatalogState();
  return {
    ...c,
    products: getInitialProductsCatalogState(),
  };
}

export function CatalogMockProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => initCatalog(), []);
  const [consortiumState, setConsortiumState] = useState<ConsortiumCatalogState>(() => ({
    consortiums: initial.consortiums,
    membersByConsortiumId: initial.membersByConsortiumId,
    contributionByConsortiumId: initial.contributionByConsortiumId,
    contributionSummaryByConsortiumId: initial.contributionSummaryByConsortiumId,
  }));
  const [products, setProducts] = useState<ConfiguredProduct[]>(() => initial.products);

  const persist = useCallback((cons: ConsortiumCatalogState, prods: ConfiguredProduct[]) => {
    try {
      const payload: PersistedCatalog = {
        consortiums: cons.consortiums,
        membersByConsortiumId: cons.membersByConsortiumId,
        contributionByConsortiumId: cons.contributionByConsortiumId,
        contributionSummaryByConsortiumId: cons.contributionSummaryByConsortiumId,
        products: prods,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    persist(consortiumState, products);
  }, [consortiumState, products, persist]);

  const addConsortium = useCallback((input: AddConsortiumInput): Consortium => {
    let created!: Consortium;
    setConsortiumState((prev) => {
      const id = nextConsortiumId(prev.consortiums);
      const membersCount = input.members.length;
      const dataVolume =
        input.consortium.dataVolume ??
        (membersCount ? `${Math.max(1, membersCount) * 350}K records / mo` : "—");
      const row: Consortium = {
        id,
        name: input.consortium.name,
        type: input.consortium.type,
        membersCount,
        dataVolume,
        status: input.consortium.status ?? (membersCount ? "active" : "pending"),
        description: input.consortium.description,
        purpose: input.consortium.purpose,
        governanceModel: input.consortium.governanceModel,
        dataPolicy: input.consortium.dataPolicy,
      };
      created = row;
      return {
        consortiums: [...prev.consortiums, row],
        membersByConsortiumId: { ...prev.membersByConsortiumId, [id]: input.members },
        contributionByConsortiumId: { ...prev.contributionByConsortiumId, [id]: [] },
        contributionSummaryByConsortiumId: {
          ...prev.contributionSummaryByConsortiumId,
          [id]:
            input.contributionSummary ?? {
              totalRecordsShared: "—",
              lastUpdated: "—",
              dataTypes: [],
            },
        },
      };
    });
    return created;
  }, []);

  const updateConsortium = useCallback((id: string, input: UpdateConsortiumInput) => {
    setConsortiumState((prev) => {
      const idx = prev.consortiums.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const next = [...prev.consortiums];
      const current = next[idx];
      const patch = input.consortium;
      const members = input.members;
      const membersCount = members.length;
      next[idx] = {
        ...current,
        ...patch,
        id: current.id,
        membersCount,
        dataVolume:
          patch.dataVolume ??
          current.dataVolume ??
          (membersCount ? `${Math.max(1, membersCount) * 350}K records / mo` : "—"),
      };

      const summary =
        input.contributionSummary ??
        prev.contributionSummaryByConsortiumId[id] ?? {
          totalRecordsShared: "—",
          lastUpdated: "—",
          dataTypes: [],
        };

      return {
        consortiums: next,
        membersByConsortiumId: { ...prev.membersByConsortiumId, [id]: members },
        contributionByConsortiumId: prev.contributionByConsortiumId,
        contributionSummaryByConsortiumId: {
          ...prev.contributionSummaryByConsortiumId,
          [id]: summary,
        },
      };
    });
  }, []);

  const addProduct = useCallback(
    (p: Omit<ConfiguredProduct, "id" | "lastUpdated">) => {
      let row!: ConfiguredProduct;
      setProducts((prev) => {
        const id = nextProductId(prev);
        row = { ...p, id, lastUpdated: new Date().toISOString() };
        return [...prev, row];
      });
      return row;
    },
    []
  );

  const updateProduct = useCallback((id: string, patch: Partial<ConfiguredProduct>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...patch, lastUpdated: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const value = useMemo(
    (): CatalogMockContextValue => ({
      ...consortiumState,
      products,
      addConsortium,
      updateConsortium,
      addProduct,
      updateProduct,
    }),
    [consortiumState, products, addConsortium, updateConsortium, addProduct, updateProduct]
  );

  return (
    <CatalogMockContext.Provider value={value}>{children}</CatalogMockContext.Provider>
  );
}

export function useCatalogMock(): CatalogMockContextValue {
  const ctx = useContext(CatalogMockContext);
  if (!ctx) {
    throw new Error("useCatalogMock must be used within CatalogMockProvider");
  }
  return ctx;
}
