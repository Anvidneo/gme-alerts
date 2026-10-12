import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from './api';

export interface ApiState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

// Los 4xx traen un mensaje de la API pensado para el usuario; un 5xx o un fallo de red no.
export const errorMessage = (err: unknown) =>
  err instanceof ApiError && err.status < 500
    ? err.message
    : 'El servidor no está disponible. Intenta de nuevo en un momento.';

// Carga `path` y lo vuelve a cargar cuando cambia el token, la ruta o `reloadKey`.
// Si llega una petición nueva antes de que termine la anterior, la anterior se aborta:
// así una respuesta lenta y vieja nunca pisa a la más reciente.
export function useApi<T>(token: string, path: string, reloadKey = 0): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    // Se conservan los datos anteriores mientras carga, para que la tabla no parpadee.
    setState((previous) => ({ data: previous.data, loading: true }));

    apiFetch<T>(token, path, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ error: errorMessage(err), loading: false });
      });

    return () => controller.abort();
  }, [token, path, reloadKey]);

  return state;
}
