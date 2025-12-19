# Cómo Obtener las Credenciales Correctas de Supabase

## Paso a Paso

1. **Ve a tu Dashboard de Supabase**
   - URL: https://supabase.com/dashboard

2. **Selecciona tu proyecto**
   - Haz click en tu proyecto "sistemadereservas" o como lo hayas llamado

3. **Ve a Settings (Configuración)**
   - En el menú lateral izquierdo, busca el ícono de engranaje ⚙️
   - Click en "Settings"

4. **Selecciona API**
   - En el menú de Settings, busca "API"

5. **Copia EXACTAMENTE estos valores:**

   **Project URL:**
   ```
   Debe verse como: https://tuproyecto.supabase.co
   ```
   
   **anon/public key:**
   ```
   Debe verse como: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   (es un token muy largo que empieza con "eyJ")
   ```

## ⚠️ IMPORTANTE

**NO copies estas claves:**
- ❌ `service_role` (esta es secreta y peligrosa)
- ❌ `sb_publishable_...` (esta NO es la correcta)

**SÍ copia estas:**
- ✅ La URL del proyecto (https://...)
- ✅ El token `anon` que empieza con `eyJ`

## Tu archivo `.env.local` debe verse así:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cHJveWVjdG8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODMyODgwMCwiZXhwIjoxOTUzOTA0ODAwfQ.TU_CLAVE_AQUI_MUY_LARGA
```

**Sin espacios, sin comillas, sin comentarios.**

## Después de copiar las credenciales correctas:

1. Guarda el archivo `.env.local`
2. Reinicia el servidor: detén con Ctrl+C y corre `pnpm run dev`
3. Visita: http://localhost:3000/test-supabase

¡Debería conectar! 🎯
