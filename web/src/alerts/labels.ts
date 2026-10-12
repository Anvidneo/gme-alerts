import { AlertStatus, Severity } from './types';

// De mayor a menor urgencia: es el orden en que se muestran las tarjetas.
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const STATUS_LABEL: Record<AlertStatus, string> = {
  open: 'Abierta',
  acknowledged: 'Reconocida',
};

const TYPE_LABEL: Record<string, string> = {
  overspeed: 'Exceso de velocidad',
  geofence_exit: 'Salida de geocerca',
  device_offline: 'Dispositivo sin reportar',
  engine_temp: 'Temperatura de motor',
  low_battery: 'Batería baja',
  harsh_braking: 'Frenado brusco',
};

export const typeLabel = (type: string) => TYPE_LABEL[type] ?? type;

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
