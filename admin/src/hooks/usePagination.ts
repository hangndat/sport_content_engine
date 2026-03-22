import { useState, useEffect, useRef } from 'react';

export function usePagination<T = unknown>(
  fetchFn: (params: Record<string, unknown>) => Promise<{ data: unknown[]; total: number }>,
  defaultPageSize = 20,
  extraParams?: Record<string, unknown>,
  /** Optional: explicit deps for when extraParams changes. Avoids unstable JSON.stringify in effects. */
  extraParamsDeps?: unknown[]
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevParamsKeyRef = useRef<string>('');

  const paramsKey = extraParamsDeps !== undefined
    ? extraParamsDeps.join('\0')
    : JSON.stringify(extraParams ?? {});

  useEffect(() => {
    if (prevParamsKeyRef.current !== paramsKey) {
      prevParamsKeyRef.current = paramsKey;
      setPage(1);
    }
  }, [paramsKey]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchFn({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...extraParams,
      });
      setData((res.data ?? []) as T[]);
      setTotal(res.total ?? 0);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // paramsKey captures extraParams identity; fetchFn and extraParams are stable enough for typical usage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, paramsKey]);

  const refetch = () => load();

  return {
    data,
    total,
    loading,
    refetch,
    page,
    pageSize,
    setPage,
    setPageSize,
    pagination: {
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: ['50', '100', '200', '500'],
      onChange: (p: number, ps: number) => {
        setPage(p);
        if (ps !== pageSize) {
          setPageSize(ps);
          setPage(1);
        }
      },
    },
  };
}
