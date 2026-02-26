# NutriSync Web (GitHub Pages-ready)

Una app web moderna (tipo la imagen) para plan diario de comidas, con:
- Login con **Google** (Firebase Auth) ✅
- Botón estilo Apple / iCloud (placeholder) ⚠️
- Plan diario con tarjetas de comidas
- Alertas / recordatorios por horario (Web Notifications)
- Barra inferior de navegación tipo app
- Menú lateral (drawer)
- PWA (se puede “Instalar” como app)

## 1) Ejecutar local
1. Descarga/extrae este proyecto
2. Abre una terminal en la carpeta del proyecto
3. Corre un servidor simple (elige uno):
   - Python: `python -m http.server 8080`
   - Node: `npx serve`
4. Abre: `http://localhost:8080`

> Importante: No uses `file://` porque Firebase y el Service Worker requieren http/https.

## 2) Configurar Login con Google (Firebase)
GitHub Pages es estático, por eso usamos Firebase.

### Paso A — Crear proyecto en Firebase
1. En Firebase Console crea un proyecto
2. Agrega una **Web App**
3. Copia tu configuración (firebaseConfig)

### Paso B — Pegar config
Abre: `js/firebase-config.js` y pega tu config donde dice `PASTE_YOUR_CONFIG_HERE`.

### Paso C — Habilitar Google
Firebase Console → Authentication → Sign-in method → **Google** → Enable.

### Paso D — Autorizar dominios
En Authentication → Settings → Authorized domains agrega:
- `localhost`
- `TU_USUARIO.github.io`

## 3) Publicar en GitHub Pages
1. Sube los archivos a un repo (ej: `nutrisync-web`)
2. GitHub → Settings → Pages
3. Source: Deploy from branch
4. Branch: `main` / folder: `/root`
5. Abre tu URL y prueba Login.

## 4) Alertas (Notificaciones)
- En la pantalla **Planner** configura horarios.
- Pulsa **Enable Notifications**.
- Las notificaciones se disparan mientras la app está abierta (o instalada y “viva”).
  - En la web no hay “alarmas 100% garantizadas” en segundo plano como en Android/iOS nativo.
  - Para alarmas totalmente confiables se necesita app nativa o backend + push.

## 5) Botón Apple / iCloud
“Sign in with Apple” requiere:
- Apple Developer Program
- Service ID, dominios verificados y configuración OAuth
- A veces backend para intercambio de tokens

Por eso aquí queda como **placeholder** y te deja lista la UI. Si quieres, te lo integro con tu Service ID cuando lo tengas.

---

Hecho para: UI limpia, moderna, realista y profesional.


## AI (Plan semanal automático sin repetición)
En GitHub Pages NO pongas una API key de OpenAI dentro del JavaScript (te la roban en 5 minutos).
La forma correcta es:

1) Crear un endpoint **serverless** (recomendado: Cloudflare Worker)
2) Guardar la API key como **secreto** en el Worker
3) La web llama a TU endpoint y recibe el JSON con comidas/recetas

### Cloudflare Worker (rápido)
- El código está en: `/workers/cloudflare-worker.js`
- En Cloudflare:
  - Workers & Pages → Create Worker
  - Settings → Variables → add **OPENAI_API_KEY** (secret)
  - Pega el código y Deploy
- Copia la URL del Worker y pégala en la app (Planner → AI endpoint)

La app actualizará automáticamente 1 vez por semana (si el endpoint está configurado).


## Perfil de usuario (Firestore)
La app guarda el perfil por usuario en **Cloud Firestore**:
- Colección: `users`
- Documento: `{uid}`
- Campos: `profile`, `goalKcal`, `updatedAt`

### Activar
Firebase Console → Firestore Database → **Create database** (modo producción o prueba).
Para pruebas rápidas puedes usar modo prueba y luego endurecer reglas.

Reglas sugeridas (mínimo):
Permitir que cada usuario lea/escriba SOLO su documento.
