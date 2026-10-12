export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged';
export type Role = 'admin' | 'operator' | 'viewer';

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

export interface AlertList {
  items: Alert[];
  total: number;
  limit: number;
  offset: number;
}

export type AlertSummary = Record<Severity, number>;

export interface Me {
  id: string;
  tenantId: string;
  name: string;
  role: Role;
}
