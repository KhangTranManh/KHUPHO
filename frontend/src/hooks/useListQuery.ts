import { useState } from 'react';
import type { ListQuery, Paged } from '@/types/common';
import { useAsync } from './useAsync';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Trạng thái chung của một trang danh sách: tìm kiếm (debounce) + bộ lọc + phân trang.
 * `fetcher` phải là hàm ổn định (khai báo ở module, ví dụ getResidents).
 */
export function useListQuery<F extends string, T>(
  fetcher: (query: ListQuery<F>) => Promise<Paged<T>>,
  pageSize = 10,
) {
  const [search, setSearchState] = useState('');
  const [filter, setFilterState] = useState<F | 'all'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const result = useAsync(
    () => fetcher({ search: debouncedSearch, filter, page, pageSize }),
    [debouncedSearch, filter, page, pageSize],
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
