import { formatDate, SEVERITY_LABEL, STATUS_LABEL, typeLabel } from './labels';
import { Alert } from './types';

interface Props {
  alerts: Alert[];
  canAcknowledge: boolean;
  acknowledgingId?: number;
  onAcknowledge: (alert: Alert) => void;
}

export function AlertsTable({ alerts, canAcknowledge, acknowledgingId, onAcknowledge }: Props) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Dispositivo</th>
            <th>Tipo</th>
            <th>Severidad</th>
            <th>Mensaje</th>
            <th>Estado</th>
            {canAcknowledge && <th className="action">Acción</th>}
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.id}>
              <td className="nowrap muted">{formatDate(alert.createdAt)}</td>
              <td className="nowrap device">{alert.deviceId}</td>
              <td>{typeLabel(alert.type)}</td>
              <td>
                <span className={`pill pill-${alert.severity}`}>{SEVERITY_LABEL[alert.severity]}</span>
              </td>
              <td>{alert.message}</td>
              <td className="nowrap">
                <span className={`status status-${alert.status}`}>{STATUS_LABEL[alert.status]}</span>
                {alert.acknowledgedAt && (
                  <span className="status-date">{formatDate(alert.acknowledgedAt)}</span>
                )}
              </td>
              {canAcknowledge && (
                <td className="action">
                  {alert.status === 'open' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onAcknowledge(alert)}
                      disabled={acknowledgingId !== undefined}
                    >
                      {acknowledgingId === alert.id ? 'Reconociendo…' : 'Reconocer'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
