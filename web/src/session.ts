export interface DevSession {
  token: string;
  label: string;
}

// Tokens de desarrollo sembrados en api/db/002_seed.sql.
export const DEV_SESSIONS: DevSession[] = [
  { token: 'dev-norte-admin', label: 'Laura Gómez — Distribuidora Norte (admin)' },
  { token: 'dev-norte-operator', label: 'Andrés Restrepo — Distribuidora Norte (operador)' },
  { token: 'dev-norte-viewer', label: 'Camila Ríos — Distribuidora Norte (solo lectura)' },
  { token: 'dev-sur-admin', label: 'Julián Torres — Distribuidora Sur (admin)' },
  { token: 'dev-sur-operator', label: 'Valentina Mejía — Distribuidora Sur (operador)' },
];
