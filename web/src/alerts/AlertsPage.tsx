import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { errorMessage, useApi } from '../useApi';
import { AlertsTable } from './AlertsTable';
import { endOfLocalDay, SEVERITIES, SEVERITY_LABEL, startOfLocalDay } from './labels';
import { SummaryCards } from './SummaryCards';
import { Alert, AlertList, AlertStatus, AlertSummary, Me, Role, Severity } from './types';

const PAGE_SIZE = 10;
const CAN_ACKNOWLEDGE: Role[] = ['admin', 'operator'];
// Cada cuánto se vuelven a pedir la lista y el resumen para ver cambios de otras personas.
const REFRESH_MS = 30_000;

const STATUS_OPTIONS: { value: AlertStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'open', label: 'Abiertas' },
  { value: 'acknowledged', label: 'Reconocidas' },
];

const SEVERITY_OPTIONS: { value: Severity | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s] })),
];

export function AlertsPage({ token }: { token: string }) {
  const [status, setStatus] = useState<AlertStatus | ''>('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  // Días en formato YYYY-MM-DD, tal como los entrega <input type="date">.
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  const [page, setPage] = useState(0);
  // Al incrementarlo se recargan la lista y el resumen (tras reconocer o al reintentar).
  const [reloadKey, setReloadKey] = useState(0);
  const [acknowledgingId, setAcknowledgingId] = useState<number>();
  const [acknowledgeError, setAcknowledgeError] = useState<string>();

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  if (fromDay) params.set('from', startOfLocalDay(fromDay));
  if (toDay) params.set('to', endOfLocalDay(toDay));

  const me = useApi<Me>(token, '/me');
  const summary = useApi<AlertSummary>(token, '/alerts/summary', reloadKey);
  const alerts = useApi<AlertList>(token, `/alerts?${params}`, reloadKey);

  // El rol viene de la API. Ocultar el botón es solo comodidad: quien decide es el servidor (403).
  const canAcknowledge = me.data !== undefined && CAN_ACKNOWLEDGE.includes(me.data.role);
  const total = alerts.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Si la página actual quedó vacía (p. ej. se reconoció la última alerta abierta de la
  // última página), se retrocede a la última página que sí tiene datos.
  useEffect(() => {
    if (!alerts.loading && alerts.data && page > 0 && page >= pageCount) {
      setPage(pageCount - 1);
    }
  }, [alerts.loading, alerts.data, page, pageCount]);

  const reload = () => setReloadKey((key) => key + 1);

  // Refresco automático: otra persona puede reconocer alertas o pueden llegar nuevas.
  // No se consulta mientras la pestaña está oculta; al volver a ella se actualiza de inmediato.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    const timer = window.setInterval(refreshIfVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  const hasFilters = status !== '' || severity !== '' || fromDay !== '' || toDay !== '';

  function clearFilters() {
    setStatus('');
    setSeverity('');
    setFromDay('');
    setToDay('');
    setPage(0);
  }

  async function acknowledge(alert: Alert) {
    setAcknowledgingId(alert.id);
    setAcknowledgeError(undefined);
    try {
      await apiFetch<Alert>(token, `/alerts/${alert.id}/ack`, { method: 'PATCH' });
    } catch (err) {
      setAcknowledgeError(errorMessage(err));
    } finally {
      setAcknowledgingId(undefined);
      // También se recarga si falló: un 409 significa que otra persona ya la reconoció.
      reload();
    }
  }

  return (
    <>
      <section className="hero" aria-label="Encabezado">
        <div>
          <h2>Alertas de la flota</h2>
          <p>
            {me.data
              ? `${me.data.name} · rol ${me.data.role}${canAcknowledge ? '' : ' (solo lectura)'}`
              : 'Vehículos que requieren atención'}
          </p>
        </div>
        {summary.data && (
          <span className="hero-chip">
            {SEVERITIES.reduce((sum, s) => sum + summary.data![s], 0)} abiertas
          </span>
        )}
      </section>

      <SummaryCards summary={summary} />

      <section className="card">
        <div className="toolbar">
          <ChipGroup
            label="Estado"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
          />
          <ChipGroup
            label="Severidad"
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={(value) => {
              setSeverity(value);
              setPage(0);
            }}
          />
          <div className="chip-group">
            <span className="chip-group-label">Fecha</span>
            <label className="date-field">
              Desde
              <input
                type="date"
                value={fromDay}
                max={toDay || undefined}
                onChange={(e) => {
                  const day = e.target.value;
                  setFromDay(day);
                  // Un rango invertido no tiene sentido: se arrastra la otra fecha al mismo día.
                  if (day && toDay && day > toDay) setToDay(day);
                  setPage(0);
                }}
              />
            </label>
            <label className="date-field">
              Hasta
              <input
                type="date"
                value={toDay}
                min={fromDay || undefined}
                onChange={(e) => {
                  const day = e.target.value;
                  setToDay(day);
                  if (day && fromDay && day < fromDay) setFromDay(day);
                  setPage(0);
                }}
              />
            </label>
          </div>
          <div className="toolbar-actions">
            {hasFilters && (
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={reload}>
              Actualizar
            </button>
          </div>
        </div>

        {me.error && (
          <p className="notice notice-error" role="alert">
            No se pudo verificar tu rol: {me.error} Las acciones no están disponibles.
          </p>
        )}
        {acknowledgeError && (
          <p className="notice notice-error" role="alert">
            No se pudo reconocer la alerta: {acknowledgeError}
          </p>
        )}

        <div aria-live="polite" aria-busy={alerts.loading}>
          {alerts.error ? (
            <p className="notice notice-error" role="alert">
              No se pudieron cargar las alertas: {alerts.error}
              <button type="button" className="btn btn-secondary" onClick={reload}>
                Reintentar
              </button>
            </p>
          ) : !alerts.data ? (
            <p className="empty-state">Cargando alertas…</p>
          ) : alerts.data.items.length === 0 ? (
            <p className="empty-state">No hay alertas que coincidan con los filtros.</p>
          ) : (
            <div className={alerts.loading ? 'is-loading' : undefined}>
              <AlertsTable
                alerts={alerts.data.items}
                canAcknowledge={canAcknowledge}
                acknowledgingId={acknowledgingId}
                onAcknowledge={acknowledge}
              />
            </div>
          )}
        </div>

        {alerts.data && total > 0 && (
          <nav className="pagination" aria-label="Paginación">
            <span>
              Página {page + 1} de {pageCount} · {total} {total === 1 ? 'alerta' : 'alertas'}
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(page - 1)}
                disabled={page === 0 || alerts.loading}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage(page + 1)}
                disabled={page + 1 >= pageCount || alerts.loading}
              >
                Siguiente
              </button>
            </div>
          </nav>
        )}
      </section>
    </>
  );
}

interface ChipGroupProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Filtro de selección única como grupo de botones; `aria-pressed` indica cuál está activo.
function ChipGroup<T extends string>({ label, value, options, onChange }: ChipGroupProps<T>) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      <span className="chip-group-label">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'chip active' : 'chip'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
