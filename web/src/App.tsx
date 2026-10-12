import { useState } from 'react';
import { DEV_SESSIONS } from './session';

export function App() {
  const [token, setToken] = useState(DEV_SESSIONS[0].token);

  return (
    <div className="layout">
      <header className="topbar">
        <h1>Portal de distribuidores</h1>
        <label>
          Sesión de desarrollo:{' '}
          <select value={token} onChange={(e) => setToken(e.target.value)}>
            {DEV_SESSIONS.map((s) => (
              <option key={s.token} value={s.token}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main>
        <p className="placeholder">Aquí va la página de alertas.</p>
      </main>
    </div>
  );
}
