# Recibos → Humand (Vercel)

Herramienta para separar sábanas y/o subir PDFs sueltos a Humand.

## Estructura

```
humand-uploader/
├── api/
│   └── upload.js       ← Función serverless (proxy a Humand)
├── public/
│   └── index.html      ← Frontend
├── vercel.json         ← Configuración de rutas
└── package.json
```

## Deploy en Vercel

### Opción 1: Desde GitHub
1. Subí esta carpeta a un repo de GitHub
2. Entrá a [vercel.com](https://vercel.com) y conectá el repo
3. En **Settings → Environment Variables** agregá:
   - `HUMAND_API_KEY` = `NzE2MzAxMTotOGdtQ2dVVlBkQ1pKX3l6MkJ4RnQ3ZWNsSHd3MVY0VA==`
4. Deploy

### Opción 2: Vercel CLI
```bash
npm i -g vercel
cd humand-uploader
vercel env add HUMAND_API_KEY    # pegá tu key cuando te pregunte
vercel --prod
```

## Importante

- La API key queda en el servidor como variable de entorno, **nunca** llega al navegador
- El frontend le pega a `/api/upload?userId=DNI` que es tu propia función serverless
- Tu función reenvía la petición a `api-prod.humand.co` con la key → no hay CORS
- Plan Hobby de Vercel tiene límite de **4.5MB por request** — si algún PDF es más grande, considerá el plan Pro
