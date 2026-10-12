# API de alertas — referencia

Prefijo: `/api`. Todas las rutas requieren `Authorization: Bearer <token>`.

Tokens de desarrollo (ver `db/002_seed.sql`):

| Token | Usuario | Distribuidor | Rol |
|---|---|---|---|
| `dev-norte-admin` | Laura Gómez | `dist-norte` | admin |
| `dev-norte-operator` | Andrés Restrepo | `dist-norte` | operator |
| `dev-norte-viewer` | Camila Ríos | `dist-norte` | viewer |
| `dev-sur-admin` | Julián Torres | `dist-sur` | admin |
| `dev-sur-operator` | Valentina Mejía | `dist-sur` | operator |

## `GET /alerts`

Lista las alertas del distribuidor del usuario, de la más reciente a la más antigua.

| Parámetro | Tipo | Por defecto | Notas |
|---|---|---|---|
| `status` | `open` \| `acknowledged` | — | Opcional |
| `limit` | entero 1–100 | 25 | |
| `offset` | entero ≥ 0 | 0 | |

```json
{
  "items": [
    {
      "id": 118,
      "tenantId": "dist-norte",
      "deviceId": "dist-norte-veh-03",
      "type": "overspeed",
      "severity": "high",
      "status": "open",
      "message": "Exceso de velocidad: 112 km/h en zona de 80 km/h",
      "createdAt": "2026-10-08T21:14:00.000Z",
      "acknowledgedAt": null,
      "acknowledgedBy": null
    }
  ],
  "limit": 25,
  "offset": 0
}
```

## `PATCH /alerts/:id/ack`

Marca una alerta como reconocida por el usuario actual. Roles: `admin`, `operator`.

| Respuesta | Cuándo |
|---|---|
| `200` + la alerta actualizada | Reconocida |
| `403` | El rol del usuario no lo permite |
| `404` | La alerta no existe |
| `409` | La alerta ya estaba reconocida |
