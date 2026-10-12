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

## Errores

Todas las rutas responden con el formato estándar de NestJS:

```json
{ "message": "La alerta 118 no existe", "error": "Not Found", "statusCode": 404 }
```

En los errores de validación (`400`), `message` puede ser una lista de mensajes.

| Código | Cuándo |
|---|---|
| `400` | Parámetro inválido o desconocido |
| `401` | Falta el token o no es válido |
| `403` | El rol del usuario no permite la acción |
| `404` | El recurso no existe **para el distribuidor del usuario** |
| `409` | La alerta ya estaba reconocida |

## `GET /me`

Devuelve el usuario dueño del token. El portal lo usa para saber qué acciones mostrar.

```json
{ "id": "u-norte-op", "tenantId": "dist-norte", "name": "Andrés Restrepo", "role": "operator" }
```

## `GET /alerts`

Lista las alertas del distribuidor del usuario, de la más reciente a la más antigua.
Los filtros se pueden combinar entre sí.

| Parámetro | Tipo | Por defecto | Notas |
|---|---|---|---|
| `status` | `open` \| `acknowledged` | — | Opcional |
| `severity` | `low` \| `medium` \| `high` \| `critical` | — | Opcional |
| `deviceId` | texto | — | Opcional. Un dispositivo de otro distribuidor devuelve una lista vacía |
| `from` | fecha ISO 8601 | — | Opcional. `created_at` mayor o igual |
| `to` | fecha ISO 8601 | — | Opcional. `created_at` menor o igual |
| `limit` | entero 1–100 | 25 | |
| `offset` | entero ≥ 0 | 0 | |

Fechas (`from`, `to`):

- Aceptan fecha (`2026-10-04`) o fecha y hora (`2026-10-04T15:30:00Z`, `2026-10-04T10:30:00-05:00`).
- Sin zona horaria se interpretan como UTC.
- `to` con solo fecha incluye el día completo: `to=2026-10-04` abarca hasta las 23:59:59.999 UTC del día 4.
- Responden `400` una fecha mal formada, un día inexistente (`2026-02-30`) y `from` posterior a `to`.

Cualquier parámetro que no esté en la tabla responde `400` (por ejemplo `severty=high`).

`total` es la cantidad de alertas que cumplen los filtros, sin importar `limit` ni `offset`.

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
  "total": 66,
  "limit": 25,
  "offset": 0
}
```

## `GET /alerts/summary`

Cantidad de alertas **abiertas** del distribuidor del usuario por severidad. Siempre devuelve
las cuatro severidades, en `0` si no hay ninguna. Disponible para los tres roles.

```json
{ "low": 8, "medium": 10, "high": 12, "critical": 13 }
```

## `PATCH /alerts/:id/ack`

Marca una alerta como reconocida por el usuario actual. Roles: `admin`, `operator`.

| Respuesta | Cuándo |
|---|---|
| `200` + la alerta actualizada | Reconocida |
| `403` | El rol del usuario no lo permite |
| `404` | La alerta no existe o pertenece a otro distribuidor |
| `409` | La alerta ya estaba reconocida |

Una alerta de otro distribuidor responde siempre `404`, esté abierta o reconocida, para no
revelar que existe. Si dos usuarios la reconocen a la vez, solo uno recibe `200`.
