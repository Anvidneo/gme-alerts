import { useEffect, useRef, useState } from 'react';
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
  // Recurso (token + ruta) al que corresponden los datos que hay en `state`.
  const loaded = useRef<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const resource = `${token} ${path}`;
    // Si solo cambió `reloadKey` es un refresco de lo que ya se ve: se actualiza en
    // segundo plano, sin marcar "cargando", para que el refresco periódico no parpadee.
    const isRefresh = loaded.current === resource;
    // Se conservan los datos anteriores mientras carga, para que la tabla no salte.
    setState((previous) => ({ data: previous.data, loading: !(isRefresh && previous.data) }));

    apiFetch<T>(token, path, { signal: controller.signal })
      .then((data) => {
        loaded.current = resource;
        setState({ data, loading: false });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        loaded.current = undefined;
        setState({ error: errorMessage(err), loading: false });
      });

    return () => controller.abort();
  }, [token, path, reloadKey]);

  return state;
}
