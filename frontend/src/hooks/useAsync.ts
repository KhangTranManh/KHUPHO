import { useCallback, useEffect, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

/**
 * Chạy `fn` mỗi khi `deps` đổi (hoặc khi gọi `reload()`). Giữ `data` cũ trong lúc tải lại
 * để bảng không nháy trắng. Bỏ qua kết quả của lần gọi cũ nếu deps đã đổi trước khi nó trả về.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ data: s.data, loading: true }));
    fn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps do người gọi quyết định
  }, [...deps, version]);

  /** Tải lại với cùng tham số — dùng sau khi thêm / sửa dữ liệu. */
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload };
}
