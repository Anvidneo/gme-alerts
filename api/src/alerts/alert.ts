export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged';

export interface Alert {
  id: number;
  tenantId: string;
  deviceId: string;
  type: string;
  severity: Severity;
  status: AlertStatus;
  message: string;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

export type AlertSummary = Record<Severity, number>;
