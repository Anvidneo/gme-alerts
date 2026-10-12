# Prueba práctica — Ingeniero(a) Full-Stack (NestJS + React)

**GME International · Medellín · octubre 2026**

Gracias por llegar hasta aquí. Esta prueba se parece al trabajo del día a día en el cargo: tomar un código que ya está en producción, entenderlo, extenderlo y dejarlo mejor de lo que estaba.

## Contexto

Nuestra plataforma recibe telemetría de vehículos con dispositivos GPS. Cuando un vehículo hace algo que requiere atención (exceso de velocidad, salida de una geocerca, dispositivo sin reportar…), se genera una **alerta**.

Las alertas se muestran en el **portal de distribuidores**. Cada distribuidor (*tenant*) administra su propia flota y sus usuarios tienen uno de tres roles:

| Rol | Puede ver alertas | Puede reconocer alertas |
|---|:-:|:-:|
| `admin` | ✅ | ✅ |
| `operator` | ✅ | ✅ |
| `viewer` | ✅ | ❌ |

**Regla de negocio no negociable:** un distribuidor nunca puede ver ni modificar datos de otro distribuidor.

Este repositorio es una versión reducida de ese servicio:

- `api/`: API en NestJS 11 + PostgreSQL (SQL directo con `pg`). Ya está en producción con dos endpoints: listar alertas y reconocer una alerta. Ver [`api/API.md`](api/API.md).
- `web/`: esqueleto del portal en React + Vite. Todavía no tiene la página de alertas.

## Cómo correrlo

Necesitas Node.js 20 o superior y Docker.

```bash
docker compose up -d            # Postgres en el puerto 5433, con esquema y datos de prueba

cd api
npm install
npm run test:e2e                # las pruebas existentes deben pasar
npm run start:dev               # API en http://localhost:3000/api

cd ../web
npm install
npm run dev                     # portal en http://localhost:5173
```

La API usa `DATABASE_URL` y `PORT` si están definidas (ver `api/.env.example`); sin ellas, apunta a la base local de Docker.

La autenticación está simplificada para la prueba: cada usuario tiene un token fijo (por ejemplo `dev-norte-admin`), que se envía como `Authorization: Bearer <token>`. El portal tiene un selector para cambiar de sesión.

## Lo que te pedimos

### 1. API: filtros y paginación en `GET /alerts`
- Agrega los filtros `severity`, `deviceId`, `from` y `to` (fechas ISO 8601, sobre `created_at`), combinables entre sí y con el `status` que ya existe.
- La respuesta debe incluir el **total** de resultados que cumplen los filtros, para poder paginar en el portal.
- Los parámetros inválidos deben responder `400` con un mensaje claro.

### 2. API: resumen para el tablero
- Crea `GET /alerts/summary`, que devuelva cuántas alertas **abiertas** tiene el distribuidor por severidad (`low`, `medium`, `high`, `critical`).

### 3. Portal: página de alertas
- Tarjetas con el resumen por severidad en la parte superior.
- Tabla de alertas con filtros por estado y severidad, y paginación.
- Botón **Reconocer** en las alertas abiertas, visible solo para los roles que pueden usarlo. La lista y el resumen deben reflejar el cambio.
- Estados de carga, error y "sin resultados".

No buscamos un diseño elaborado: limpio y usable es suficiente. Puedes agregar las librerías que quieras, pero explica por qué.

### 4. Pruebas
- Pruebas e2e para lo que agregues en la API.
- En el portal, las pruebas son opcionales. Si agregas alguna, que sea donde más valor aporte.

### 5. `NOTAS.md` (obligatorio)
Un archivo corto en la raíz con:
1. Cómo correr lo que hiciste, si cambió algo.
2. Las decisiones importantes que tomaste y por qué.
3. **El código existente está en producción. Si encontraste algo en él que te preocupe, descríbelo**: qué es, qué impacto tiene y si lo corregiste o cómo lo corregirías.
4. Qué harías con más tiempo.
5. **Uso de IA:** qué herramientas usaste, para qué, y al menos un caso en que la IA se equivocó y cómo te diste cuenta. Usar IA está permitido y es normal en nuestro equipo. Lo que evaluamos es el criterio con que la usas.

## Tiempo y entrega

- Calculamos entre **3 y 4 horas**. Por favor, no le dediques más de 4: si no alcanzas todo, prioriza y explica en `NOTAS.md` qué dejaste por fuera y por qué. Una entrega parcial bien razonada vale más que una completa sin criterio.
- Tienes **72 horas** desde que recibes la prueba.
- Entrega un repositorio Git (GitHub, GitLab o Bitbucket; si es privado, te diremos a quién darle acceso) o un `.zip` **con la carpeta `.git` incluida**. Queremos ver tus commits, así que haz commits pequeños con mensajes claros.
- Después revisaremos tu entrega contigo en una llamada de unos 30 minutos.

Si algo del enunciado no está claro, toma una decisión razonable, anótala en `NOTAS.md` y sigue adelante. También puedes escribirnos.

¡Éxitos!
