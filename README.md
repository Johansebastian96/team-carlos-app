# Team Carlos · TMC

App (PWA) de **entrenamiento personalizado** en gimnasio para los clientes de Team Carlos.
En vivo: <https://team-carlos-app.netlify.app>

## Qué hace

**Clientes**
- Entran con el correo del team y su **PIN de 4 números** (cada quien ve solo su plan y sus datos).
- **Hoy:** el día de su plan semanal (por ejemplo, Pecho + Tríceps), con cada ejercicio, series × reps, descanso, duración y RPE.
- **Registro por serie:** anotan peso y reps, y al marcar la serie arranca solo el **descanso** (flotante, con ±15 s).
- **Ayudas del coach:** la app muestra lo que hicieron la vez anterior, avisa cuándo **subir carga** (+2,5–5 % al completar el rango alto de reps) y sugiere una carga a partir de su RM, dejando 2 repeticiones en reserva.
- **Técnica:** cada ejercicio puede tener un video de técnica, una alternativa (si la máquina está ocupada) y una nota del cliente para Carlos.
- **Avisos en Hoy:** nutrición del día, check-in pendiente, reto del mes y mensualidad por vencer.
- **Comida:** su plan de alimentación (objetivo, calorías, macros, comidas con alternativas, suplementos, notas y lista de mercado). Marca cada comida y los vasos de agua; el día completo suma +5 puntos.
- **Progreso:** peso y medidas con gráfica, fotos de progreso **privadas** (antes y ahora), check-in semanal (+20) con respuesta del coach, y logros.
- **RMs:** historial, porcentajes, PRs, análisis del año, próximos PRs estimados y ratios de fuerza con "dónde enfocar".
- **Timer:** descanso entre series, cronómetro de sesión e intervalos (Tabata / HIIT). Se abre desde el ícono del reloj en Hoy.
- **Team:** podio de hoy, semana, mes y temporada, **reto del mes** (+100 al cumplirlo) y el equipo. El podio premia la **constancia, no el peso**. Los días de descanso del plan no rompen la racha.
- **Compartir:** imágenes para historias de Instagram del entreno terminado, de un PR y de los logros, y la imagen del plan semanal.
- **Recordatorios (push):** el día que toca entrenar, si se le olvidó marcar sus series y el domingo para el check-in. En iPhone hay que instalar la app en la pantalla de inicio (iOS 16.4 o más reciente).

**Coach (Carlos)**
- **Dashboard:** quién entrenó hoy, quién está pendiente, PRs de la semana y clientes sin plan.
- **Clientes:** crear clientes (con PIN), renombrar, cambiar el PIN y eliminar.
- **Dashboard:** avisos de check-ins, nutrición y mensualidades, el **reto del mes** (crear, editar, quitar) y sus recordatorios.
- **Planes · Entreno:** editor por cliente con días, secciones (movilidad, estiramientos…), ejercicios, series, reps, descanso, duración, RPE, video de técnica, alternativa y consejos. Incluye la **plantilla TMC de 5 días**, copiar el plan de otro cliente y descargarlo como **imagen**. Los videos y alternativas se recuerdan y se autocompletan.
- **Planes · Nutrición:** calculadora de calorías (Mifflin-St Jeor + actividad + objetivo) que llena los macros y el agua, editor de comidas con alternativas, suplementos, lista de mercado y notas. Incluye una plantilla TMC con comida colombiana.
- **Seguimiento:** cumplimiento semana a semana, check-ins de la semana con respuesta, peso/medidas/fotos de cada cliente y los comentarios que dejan en sus ejercicios.
- **Pagos:** valor, ciclo y fecha de pago de cada cliente, estado (al día / por vencer / vencida), registro de pagos, cobrado en el mes y recordatorio por **WhatsApp** con un toque.

## Cómo está hecha

| Parte | Archivo |
|---|---|
| Pantallas y estilos | `public/index.html` |
| Lógica de la app | `public/app.js` (al cambiarlo, actualiza `?v=` en `index.html`) |
| Instalación en el celular | `public/manifest.json`, `public/sw.js` |
| API (Netlify Functions) | `netlify/functions/api.mjs` |
| Lógica de rachas, puntos, retos y logros (sin red) | `src/core.mjs` |
| Sesiones y PIN | `src/auth.mjs` |
| Recordatorios push | `src/push.mjs` y `netlify/functions/reminders.mjs` (6:30 a. m. y 6:30 p. m., hora de Colombia) |

Los datos se guardan en **Netlify Blobs**, sin base de datos externa ni costos adicionales.

## Configuración en Netlify (obligatoria)

Variables de entorno del sitio (*Site configuration → Environment variables*):

| Variable | Qué es |
|---|---|
| `TMC_ATHLETE_PASS` | Contraseña compartida de los clientes (correo `atletas@teamcarlos.com`) |
| `TMC_COACH_PASS` | Contraseña del coach (correo `coach@teamcarlos.com`). Debe ser **distinta** de la de clientes. |
| `TMC_SECRET` | Texto aleatorio largo (32+ caracteres) para firmar las sesiones. Si se cambia, todos deben volver a entrar. |
| `TMC_VAPID_PUBLIC` / `TMC_VAPID_PRIVATE` | Claves para las notificaciones push (se generan con `npx web-push generate-vapid-keys`). Sin ellas la app funciona igual, solo que sin recordatorios. |

Las contraseñas **no** están en el código, porque este repositorio es público.
Para cambiar una, edita la variable en Netlify y vuelve a publicar: las sesiones abiertas con la contraseña anterior se cierran solas.

## Seguridad

- Cada cliente solo puede leer y escribir **su** plan, sus sesiones y sus RMs. El coach ve todo.
- **PIN:** se guarda con sal (nunca en texto plano). Tras 5 intentos fallidos se bloquea unos minutos. Si el coach asigna un PIN nuevo, se cierran las sesiones abiertas con el anterior.
- **Puntos:** los calcula el servidor. El total de ejercicios sale del plan guardado, y un PR solo cuenta si supera el máximo registrado antes.
- **Privacidad del podio:** los clientes ven el porcentaje de mejora de los PRs, no los kilos de los demás.
- **Fotos y medidas:** solo las ven el cliente y el coach. Las fotos se reducen en el teléfono antes de subirse y se descargan con la sesión (no tienen enlace público).
- **Pagos:** el cliente solo ve su propia fecha de pago; los valores los ve solo el coach.
- **Cabeceras de seguridad:** CSP, anti-iframe y nosniff, configuradas en `netlify.toml`.

## Desarrollo

```bash
npm install
netlify dev   # sirve public/ y la API en http://localhost:8888
```
