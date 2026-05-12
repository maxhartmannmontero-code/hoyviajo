# Configuración del CRM - InterFAX

## Paso 1: Crear proyecto en Google Cloud

1. Ve a https://console.cloud.google.com/
2. Crea un nuevo proyecto (ej: "InterFAX CRM")
3. Selecciona el proyecto recién creado

## Paso 2: Habilitar APIs

En el menú lateral → **APIs y servicios** → **Biblioteca**, busca y activa:
- ✅ Google Sheets API
- ✅ Google Drive API
- ✅ Gmail API

## Paso 3: Crear credenciales OAuth 2.0

1. Ve a **APIs y servicios** → **Credenciales**
2. Clic en **+ Crear credenciales** → **ID de cliente OAuth 2.0**
3. Configura la pantalla de consentimiento:
   - Tipo: **Externo** (o Interno si tienes Google Workspace)
   - Nombre de la app: "InterFAX CRM"
   - Agrega tu email como usuario de prueba
4. Tipo de aplicación: **Aplicación web**
5. Nombre: "InterFAX CRM Local"
6. Orígenes autorizados de JavaScript:
   ```
   http://localhost:3000
   ```
7. URIs de redirección autorizados:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
8. Guarda y copia el **Client ID** y **Client Secret**

## Paso 4: Crear la Google Sheet

1. Ve a https://sheets.google.com/
2. Crea una nueva hoja de cálculo en blanco
3. Nómbrala: **"InterFAX CRM"**
4. Copia el ID de la URL: `https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit`

## Paso 5: Configurar variables de entorno

1. Copia el archivo de ejemplo:
   ```
   copy .env.local.example .env.local
   ```
2. Edita `.env.local` con tus datos:
   ```env
   GOOGLE_CLIENT_ID=tu_client_id_de_google
   GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
   GOOGLE_SPREADSHEET_ID=id_de_tu_google_sheet
   AUTH_SECRET=una_cadena_aleatoria_segura_aqui
   NEXTAUTH_URL=http://localhost:3000
   ```

   Para generar `AUTH_SECRET`, puedes usar:
   - Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - O cualquier string aleatorio largo

## Paso 6: Ejecutar la aplicación

```bash
cd crm
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## Paso 7: Inicializar la hoja de cálculo

Después de iniciar sesión por primera vez, visita:
```
http://localhost:3000/api/init
```
(método POST) — o la app lo hará automáticamente al crear el primer registro.

Esto creará automáticamente las hojas: Contacts, Activities, Vouchers, Campaigns, Templates, Deals.

---

## Estructura de la Google Sheet

La app maneja estas hojas automáticamente:

| Hoja | Descripción |
|------|-------------|
| Contacts | Clientes y prospectos |
| Activities | Llamadas, emails, reuniones, follow-ups |
| Vouchers | Metadatos de archivos subidos a Drive |
| Campaigns | Campañas de email enviadas |
| Templates | Plantillas de email reutilizables |
| Deals | Oportunidades de venta con etapas |

Los vouchers se guardan en Google Drive en una carpeta llamada **"InterFAX CRM - Vouchers"** creada automáticamente.

---

## Solución de problemas

**Error "access_denied"**: Asegúrate de que tu email esté en la lista de usuarios de prueba en Google Cloud Console.

**Error de certificado SSL**: El proyecto ya está configurado para manejar esto en el entorno local.

**Las hojas no aparecen**: Llama `POST /api/init` después de iniciar sesión para crear la estructura.
