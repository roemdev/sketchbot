# 🌐 ARKANIA • Web Oficial de la Comunidad

Sitio web oficial y portal comunitario de **ARKANIA**, desarrollado con **Next.js 16 (App Router)**, **TypeScript**, y **Vanilla CSS**.

---

## 🎮 Servidores de Juego Hosteados

La información de los servidores dedicados se gestiona de forma centralizada en [`src/data/servers.json`](file:///c:/Users/eerd1/Documents/Projects/sketchbot/web/src/data/servers.json).

Actualmente incluye:
1. **Minecraft:** `us-abe-premium-01.arkaniahost.xyz:25565`
2. **Palworld:** `us-abe-premium-01.arkaniahost.xyz:8211`
3. **Enshrouded:** `us-abe-premium-01.arkaniahost.xyz:25574`
4. **Project Zomboid:** `us-abe-01.arkaniahost.xyz:16261`

Cada tarjeta cuenta con un botón interactivo de un solo clic para copiar la IP con su puerto.

---

## 🚀 Despliegue en Vercel

1. Importa tu repositorio en [Vercel](https://vercel.com).
2. En la configuración del proyecto (**Project Settings**):
   * **Root Directory:** `web`
3. Configura las variables de entorno (**Environment Variables**):
   * `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase.
   * `SUPABASE_SERVICE_ROLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Credenciales para métricas de arcas y ranking.
   * `NEXT_PUBLIC_DISCORD_INVITE_CODE`: Código de invitación (`jA8tx5Vwe5`).
4. Haz clic en **Deploy**.

---

## 💻 Desarrollo Local

```bash
cd web
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---
*ARKANIA Community & TCG Portal*
