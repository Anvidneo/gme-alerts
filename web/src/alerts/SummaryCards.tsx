import { ApiState } from '../useApi';
import { SEVERITIES, SEVERITY_LABEL } from './labels';
import { AlertSummary } from './types';

// Anillo SVG hecho a mano (sin librería de gráficos): el trazo se recorta con
// stroke-dashoffset según el porcentaje.
const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({ percent, severity }: { percent: number; severity: string }) {
  const offset = CIRCUMFERENCE * (1 - percent / 100);
  return (
    <svg className="kpi-ring" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={RADIUS} fill="none" stroke={`var(--${severity}-tint)`} strokeWidth="7" />
      <circle
        cx="28"
        cy="28"
        r={RADIUS}
        fill="none"
        stroke={`var(--${severity})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill={`var(--${severity}-text)`}>
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

export function SummaryCards({ summary }: { summary: ApiState<AlertSummary> }) {
  if (summary.error) {
    return (
      <p className="notice notice-error" role="alert">
        No se pudo cargar el resumen: {summary.error}
      </p>
    );
  }

  const data = summary.data;
  const totalOpen = data ? SEVERITIES.reduce((sum, severity) => sum + data[severity], 0) : 0;

  return (
    <section className="kpi-grid" aria-label="Alertas abiertas por severidad" aria-busy={summary.loading}>
      {SEVERITIES.map((severity) => {
        const count = data?.[severity] ?? 0;
        const percent = totalOpen > 0 ? (count / totalOpen) * 100 : 0;
        return (
          <div key={severity} className="kpi-card">
            <div className="kpi-text">
              <span className="kpi-label">Severidad {SEVERITY_LABEL[severity].toLowerCase()}</span>
              <span className="kpi-value">{data ? count : '…'}</span>
              <span className="kpi-sub">{count === 1 ? 'alerta abierta' : 'alertas abiertas'}</span>
            </div>
            {data && <Ring percent={percent} severity={severity} />}
          </div>
        );
      })}
    </section>
  );
}
