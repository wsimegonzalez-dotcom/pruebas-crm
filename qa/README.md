# Bot de pruebas CRM

Comprueba la muestra de `docs/` en Chromium para escritorio y móvil. En GitHub se ejecuta con cada cambio de la muestra o del bot, y manualmente desde **Actions → Bot de pruebas CRM → Run workflow**. El trabajo es de lectura del repositorio: no crea cuentas, no envía correos ni modifica el CRM.

## Qué revisa

- Las siete combinaciones de Salud, Vida y Vehículo, hasta terminar el envío simulado.
- Campos obligatorios, mensajes de error y consentimiento final.
- Filtros de aseguradoras, tarjetas, sombreado y preferencias independientes.
- Navegación hacia atrás y edición del resumen sin perder datos.
- Confirmación para quitar dependientes y validación de familia sin dependientes.
- Sugerencias de correo sin cambios automáticos.
- Carga de identificadores ilustrativos, ausencia de errores JavaScript y de envíos POST.
- Anchos en escritorio/móvil y selección con teclado en escritorio.

El proyecto móvil simula un dispositivo en Chromium; no equivale a probar todos los teléfonos, Safari o Firefox. No valida el catálogo real ni sustituye la revisión de seguridad del CRM. El caso de teclado se omite explícitamente en el proyecto móvil.

## Ejecutar localmente

Requiere Node.js 24+, Python 3.12+ y Chromium de Playwright.

```bash
cd qa
npm ci
npx playwright install chromium
npm test
npm run report
```

En este entorno se puede reutilizar el navegador instalado: `CRM_QA_CHROMIUM=/usr/bin/chromium npm test`. El bot levanta su propio servidor estático temporal en el puerto 8030 y lo cierra al terminar. No reutiliza servidores ajenos.

## Resultados y correcciones

`results/resumen.md` contiene aprobadas, fallidas, inestables y omitidas por separado. `playwright-report/index.html` ofrece el detalle; `results/report.json` permite procesarlo. En caso de fallo se conservan capturas y trazas. GitHub muestra el resumen en la ejecución y permite descargar el artefacto `informe-bot-crm` durante siete días.

Cada comprobación incluye una regla de diagnóstico con una posible corrección. Son sugerencias relacionadas con el fallo, no parches generados ni cambios automáticos. El trabajo queda fallido si las pruebas fallan, incluso si se generó el informe. No publica correcciones sin revisión.

Para validar un fallo del propio bot sin cambiar la muestra, puedes copiar la página a un entorno de prueba, introducir un error y ejecutar las pruebas ahí. Nunca provoques errores deliberadamente en la versión publicada.
