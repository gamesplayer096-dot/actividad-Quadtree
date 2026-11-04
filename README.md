# QUADTREE ARENA

Juego de Region Quadtree multijugador en tiempo real para publicar en Render.

## Publicar en Render
1. Sube esta carpeta a un repositorio de GitHub.
2. En Render, selecciona **New + → Web Service** y conecta el repositorio.
3. Render detectará `render.yaml`. Si lo configuras manualmente:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Cuando termine el despliegue, abre la URL de Render.

## Enlaces de la aplicación
- `/` o `/equipos.html`: crear partida y equipos.
- `/proyector.html`: pantalla compartida del proyector.
- `/jugador.html`: acceso de cada estudiante desde su celular.

La persona que crea la partida obtiene un código. Comparte ese código con los jugadores y con el proyector. Los equipos tienen cuatro puestos (NO, NE, SO, SE). El estado se sincroniza en tiempo real mediante Socket.IO.

## Importante
La versión inicial mantiene la partida en memoria del servidor. Si Render reinicia o vuelve a desplegar el servicio, las partidas activas se reinician. No requiere Supabase.


## Reconexión de jugadores
Si un jugador pierde internet, puede volver a entrar con el mismo código, equipo, cuadrante y nombre. El servidor recupera su puesto y conserva el puntaje y el avance de la partida. Si la conexión anterior aún aparece activa, usar exactamente el mismo nombre permite recuperar el puesto.


## Páginas de árboles
- `/arbol-alfa.html`
- `/arbol-beta.html`
- `/arbol-gamma.html`

Los árboles muestran las decisiones reales de los equipos. Una decisión equivocada se registra y se marca en rojo; el jugador puede continuar. Los aciertos en la clasificación de los cuatro hijos suman 5 puntos cada uno y los errores restan 2 puntos cada uno.
