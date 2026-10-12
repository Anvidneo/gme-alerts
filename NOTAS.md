# NOTAS

## 1. Cómo correrlo

No cambió nada respecto al README: mismos comandos, sin dependencias nuevas.

```bash
docker compose up -d
cd api && npm install && npm run test:e2e && npm run start:dev
cd web && npm install && npm run dev
```

Dos cosas a tener en cuenta:

- **Las e2e hacen `TRUNCATE` y vuelven a sembrar** la base a la que apunte `DATABASE_URL`
  (por defecto, la de Docker), y la dejan con una alerta reconocida de más (ver sección 3).
- **Si la API no corre en el puerto 3000**, el portal acepta `API_URL`:
  `API_URL=http://localhost:3010 npm run dev`. Lo agregué porque en mi máquina el 3000 y el 5433
  estaban ocupados; los valores por defecto no cambiaron.

Yo trabajé con pnpm en local. No toqué los `package-lock.json`, así que no verifiqué la
instalación con npm; al no haber dependencias nuevas, no debería cambiar.

La referencia de la API está actualizada en [`api/API.md`](api/API.md).

## 2. Decisiones importantes

- **Otro distribuidor responde 404, no 403.** Un 403 confirma que el recurso existe y es de otro.
  Una alerta ajena, una ya reconocida vista desde otro distribuidor y una inexistente responden igual.
- **`to` con solo fecha incluye el día completo** (`to=2026-10-04` abarca hasta el 4 inclusive).
  Con hora, el límite es inclusivo. Sin zona horaria se interpreta como UTC, para que el resultado
  no dependa de la zona del servidor.
- **`from` posterior a `to` → 400**, igual que una fecha inexistente (`2026-02-30`): JavaScript
  la corre en silencio al 2 de marzo, así que se valida el día de calendario explícitamente.
- **Parámetros desconocidos → 400** (`forbidNonWhitelisted`). Antes, un typo como `severty=high`
  se ignoraba y devolvía datos sin filtrar.
- **`total` con los mismos filtros, en una consulta `COUNT` aparte**, en paralelo a la de la
  página. Los filtros van siempre como parámetros de la consulta, nunca concatenados.
- **El resumen devuelve siempre las cuatro severidades**, en 0 si no hay alertas abiertas de alguna.
  `GROUP BY` omite los grupos vacíos; rellenarlos en la API evita que el portal tenga que
  distinguir "no vino la llave" de "hay cero". Lo pueden consultar los tres roles.
- **`GET /me` como fuente del rol.** El portal solo conocía el token y una etiqueta de texto.
  En lugar de duplicar el rol en el cliente, lo pregunta a la API, que ya lo resuelve desde el
  token. Ocultar el botón Reconocer es solo comodidad: quien autoriza sigue siendo la API (403).
- **Portal sin librerías nuevas.** Un hook propio (`useApi`) con `fetch` y `AbortController`:
  si cambia un filtro antes de que llegue la respuesta anterior, la anterior se cancela y no
  puede pisar a la nueva. Para una sola página no se justificaba una librería de datos.
- **Diseño con CSS propio**, sin librerías: variables de color y un anillo SVG hecho a mano.
  Reutilicé el lenguaje visual de un tablero que construí antes.
- **Refresco automático por sondeo cada 30 s**, en pausa mientras la pestaña está oculta y
  disparado al volver a ella. Se hace en segundo plano, sin estado de carga, para que la tabla
  no parpadee. Elegí sondeo porque no requiere tocar la API; con más usuarios usaría eventos.
- **El filtro de fechas del portal usa el día en la zona horaria del usuario**, la misma en que
  la tabla muestra las fechas. El portal envía el inicio y el fin de ese día como fecha y hora
  exactas; si enviara solo la fecha, la API la tomaría como día UTC y una alerta de las 11 p. m.
  en Colombia quedaría en el día siguiente.
- **Tras reconocer se vuelven a pedir lista y resumen a la API**, en vez de ajustar los números
  en el cliente: la API es la fuente de verdad y así también se refleja un 409 (otra persona
  la reconoció antes). Si la página queda vacía, se retrocede a la última con datos.

## 3. Problemas del código existente (en producción)

**Corregidos**

1. **IDOR en `PATCH /alerts/:id/ack`.** El reconocimiento buscaba y actualizaba por `id` sin
   considerar el distribuidor: un operador de Sur podía reconocer alertas de Norte, y el 409/200
   le confirmaba qué ids existían. Impacto: un distribuidor modifica datos de otro, justo la regla
   de negocio no negociable. Corregido con un `UPDATE ... WHERE id AND tenant_id AND status='open'`;
   la prueba de aislamiento fallaba contra el código original y pasa ahora.
2. **Condición de carrera en el mismo endpoint** (leer y luego escribir): dos reconocimientos
   simultáneos podían pasar y el segundo sobrescribía quién/cuándo reconoció. Corregido con el mismo
   `UPDATE` condicional. No logré reproducirla en pruebas (la ventana es de milisegundos): está
   justificada por análisis del código, y la prueba de concurrencia que dejé es una guarda de
   regresión, no una demostración.
3. **Parámetros mal escritos ignorados en silencio** (ver sección 2).

**No corregidos (y cómo los atacaría)**

- **`id::int` sobre una columna `BIGSERIAL`:** cuando un id supere 2^31, Postgres rechaza el
  cast con `integer out of range` y fallan el listado y el reconocimiento. Lo comprobé con
  `SELECT 3000000000::bigint::int`. Devolvería el id como string y ajustaría el tipo en la API
  y el portal.
- **`enableCors()` abierto a cualquier origen:** restringiría a los orígenes del portal.
- **Tokens fijos en texto plano, con una consulta a BD por petición:** simplificación declarada
  de la prueba; en producción serían JWT/sesiones firmadas con expiración y rotación.
- **Las e2e hacen `TRUNCATE` sobre la base que indique `DATABASE_URL`:** si se apunta por error
  a una base real, la borra. Usaría una base de pruebas dedicada o una guarda que se niegue a
  correr si el nombre no es de pruebas.
- **Paginación por `OFFSET`:** se degrada con muchas filas; usaría paginación por cursor
  (`created_at`, `id`) y un índice compuesto `(tenant_id, status, severity, created_at)`.
- **Las e2e dejan la base modificada:** el reseteo corre antes de cada prueba, no al final, así
  que tras `test:e2e` queda una alerta reconocida de más. Lo noté porque el resumen no cuadraba
  con un total que había anotado antes.

## 4. Qué haría con más tiempo

- Pruebas del portal donde más valor aportan (rol y botón Reconocer, estados de error). Las dejé
  fuera a propósito: el portal no trae ejecutor de pruebas y agregarlo implicaba dependencias
  nuevas y regenerar el `package-lock.json` al final del plazo. Preferí no arriesgar la
  instalación; el portal está verificado a mano en el navegador con las cinco sesiones.
- Filtro por dispositivo en el portal (la API ya lo soporta; el enunciado solo pedía estado y
  severidad, y agregué fechas).
- Reemplazar el sondeo por eventos del servidor (SSE o WebSocket) para ver los cambios al instante.
- Paginación por cursor e índice compuesto (ver sección 3).
- Autenticación real y CORS restringido.

## 5. Uso de IA

- **Herramientas:** Claude Code como asistente de programación en el repositorio (modelos
  Claude Sonnet 5.5 y Claude Opus 5.5; cada commit indica cuál en su `Co-Authored-By`).
- **Para qué:** analizar el código existente y detectar los problemas de la sección 3, proponer e
  implementar cambios en pasos pequeños, escribir pruebas y verificar el portal en el navegador.
  Yo decidí el alcance y las decisiones de la sección 2, revisé cada cambio, lo probé a mano
  contra la API y ejecuté cada commit.
- **Caso 1, una prueba que no probaba nada.** Al corregir el reconocimiento, la IA escribió una
  prueba de concurrencia (primero con 2 y luego con 10 peticiones simultáneas) dando por hecho que
  detectaba la condición de carrera. Al correrla contra el código original, **antes** de aplicar
  el arreglo, pasaba igual: no reproducía el bug y daba una falsa sensación de cobertura. Las
  pruebas de aislamiento entre distribuidores, en cambio, sí fallaban contra el código original.
  Por eso la prueba de concurrencia quedó solo como guarda de regresión y la carrera se sustenta
  por análisis. Desde ahí, las pruebas del resumen se validaron rompiendo el código a propósito
  (quitar el filtro de estado, el de distribuidor y el relleno de ceros) para confirmar que fallan.
- **Caso 2, una afirmación sin verificar.** La IA aseguró que `npm run start:dev` recargaba solo
  al cambiar el código. No es así: compila una vez y arranca. Se notó cuando la API seguía
  respondiendo sin el campo `total` después de haberlo implementado: era el proceso viejo.
- **Caso 3, un detalle técnico mal descrito.** Al redactar estas notas, la IA escribió que
  `id::int` "desborda o devuelve un valor erróneo". Lo comprobé en Postgres y no es así: la
  consulta falla con un error, no devuelve un valor incorrecto. La sección 3 describe el
  comportamiento real.
