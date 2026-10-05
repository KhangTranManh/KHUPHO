import { useState } from 'react';
import type { ListQuery, Paged } from '@/types/common';
import { useAsync } from './useAsync';
import { useDebouncedValue } from './useDebouncedValue';

interface ListQueryOptions<E extends object> {
  pageSize?: number;
  /** Tham số lọc bổ sung (VD: { category }) — đổi giá trị sẽ tải lại. */
  extra?: E;
}

/**
 * Trạng thái chung của một trang danh sách: tìm kiếm (debounce) + bộ lọc + phân trang.
 * `fetcher` phải là hàm ổn định (khai báo ở module, ví dụ getResidents).
 */
export function useListQuery<F extends string, T, E extends object = Record<never, never>>(
  fetcher: (query: ListQuery<F> & E) => Promise<Paged<T>>,
  { pageSize = 10, extra }: ListQueryOptions<E> = {},
) {
  const [search, setSearchState] = useState('');
  const [filter, setFilterState] = useState<F | 'all'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const extraKey = JSON.stringify(extra ?? {});

  const result = useAsync(
    () => fetcher({ ...(extra as E), search: debouncedSearch, filter, page, pageSize }),
    [debouncedSearch, filter, page, pageSize, extraKey],
  );

  return {
    ...result,
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    filter,
    setFilter: (value: F | 'all') => {
      setFilterState(value);
      setPage(1);
    },
    page,
    setPage,
    pageSize,
  };
}
