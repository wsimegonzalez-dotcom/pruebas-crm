const { test: base, expect } = require('@playwright/test');
const test = base.extend({
  audit: [async ({ page }, use) => {
    const errors = [];
    const posts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
    await use();
    expect(errors, 'El formulario no debe producir errores de JavaScript').toEqual([]);
    expect(posts, 'La muestra no debe enviar información al CRM ni a terceros').toEqual([]);
  }, { auto: true }],
});
const labels = { Salud: 'Tu seguro de salud', Vida: 'Tu seguro de vida', Vehículo: 'Tu seguro de vehículo' };
async function choose(page, types) {
  for (const type of types) await page.locator('.choice').filter({ has: page.locator(`[name=seguro][value="${type}"]`) }).click();
}
async function next(page) { await page.locator('#next').click(); }
function advice(text) { test.info().annotations.push({ type: 'correccion_sugerida', description: text }); }

test.beforeEach(async ({ page }) => { await page.goto('/'); });

for (let mask = 1; mask < 8; mask++) {
  const types = ['Salud', 'Vida', 'Vehículo'].filter((_, index) => mask & (1 << index));
  test(`Recorrido completo: ${types.join(' + ')}`, async ({ page }) => {
    advice('Revisar la generación de pasos condicionales, la captura de respuestas y el botón Continuar.');
    await choose(page, types);
    await next(page);
    await expect(page.getByRole('heading', { name: 'Completa tus datos', exact: true })).toBeVisible();
    await next(page);
    for (const type of types) {
      await expect(page.getByRole('heading', { name: labels[type], exact: true })).toBeVisible();
      await next(page);
    }
    await expect(page.getByRole('heading', { name: 'Revisa antes de enviar' })).toBeVisible();
    await expect(page.locator('.section')).toHaveCount(types.length + 1);
    await page.locator('#consent').check();
    await next(page);
    await expect(page.getByRole('heading', { name: '¡Recorrido completado!' })).toBeVisible();
    await expect(page.locator('.section')).toHaveCount(types.length + 1);
  });
}

test('Obligatorios y mensajes de error', async ({ page }) => {
  advice('Mostrar el error junto al formulario y enfocar el campo inválido sin perder respuestas.');
  await next(page);
  await expect(page.locator('#error')).toHaveText('Selecciona al menos un seguro para continuar.');
  await choose(page, ['Vida']);
  await next(page);
  await page.locator('[name=email]').fill('correo-invalido');
  await next(page);
  await expect(page.locator('#error')).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Completa tus datos' })).toBeVisible();
  await page.locator('[name=email]').fill('demo@example.com');
  await next(page);
  await next(page);
  await next(page);
  await expect(page.locator('#error')).not.toBeEmpty();
});

test('Galería: filtros y selección con sombreado', async ({ page }) => {
  advice('Comprobar filtros cualquiera/todos, clic en tarjeta y conservación de la preferencia por cada seguro.');
  await choose(page, ['Vida', 'Vehículo']);
  await expect(page.locator('.insurer-card')).toHaveCount(4);
  await page.selectOption('#insurer-match', 'all');
  await expect(page.locator('.insurer-card')).toHaveCount(2);
  await page.locator('[data-company=mapfre] .insurer-logo').click();
  await expect(page.locator('[data-company=mapfre]')).toHaveClass(/chosen-insurer/);
  await expect(page.locator('.catalog-policy')).toHaveCount(0);
  await next(page);
  await next(page);
  await expect(page.locator('[name=aseguradora][value=mapfre]')).toBeChecked();
  await page.locator('.insurer-option').filter({ has: page.locator('[value=universal]') }).click();
  await next(page);
  await expect(page.locator('[name=aseguradora][value=mapfre]')).toBeChecked();
  await next(page);
  await expect(page.getByText('Aseguradora: Seguros Universal', { exact: true })).toBeVisible();
  await expect(page.getByText('Aseguradora: MAPFRE República Dominicana', { exact: true })).toBeVisible();
});

test('Volver, editar y conservar datos', async ({ page }) => {
  advice('Capturar los valores antes de cambiar de paso y reponerlos al renderizar.');
  await choose(page, ['Vida', 'Vehículo']);
  await next(page);
  await next(page);
  await page.locator('[name=capital]').fill('3000000');
  await next(page);
  await page.locator('[name=marca]').fill('Marca ficticia de prueba');
  await page.locator('#back').click();
  await expect(page.locator('[name=capital]')).toHaveValue('3000000');
  await next(page);
  await expect(page.locator('[name=marca]')).toHaveValue('Marca ficticia de prueba');
  await next(page);
  await page.locator('[data-edit=Vida]').click();
  await expect(page.locator('[name=capital]')).toHaveValue('3000000');
});

test('Dependientes: cancelar y confirmar eliminación', async ({ page }) => {
  advice('Eliminar el dependiente solo después de confirmar y validar que Familiar tenga al menos uno.');
  await choose(page, ['Salud']);
  await next(page);
  await next(page);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Quitar dependiente', exact: true }).click();
  await expect(page.locator('.dependent')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Quitar dependiente', exact: true }).click();
  await expect(page.locator('.dependent')).toHaveCount(0);
  await next(page);
  await expect(page.locator('#error')).toHaveText('Añade al menos un dependiente o selecciona Individual.');
});

test('Correo: sugerir sin corregir automáticamente', async ({ page }) => {
  advice('Aplicar la sugerencia solo al aceptarla; no modificar dominios desconocidos.');
  await choose(page, ['Vida']);
  await next(page);
  const email = page.locator('[name=email]');
  await email.fill('demo@gmial.com');
  await expect(email).toHaveValue('demo@gmial.com');
  await page.getByRole('button', { name: 'Conservar mi correo', exact: true }).click();
  await expect(email).toHaveValue('demo@gmial.com');
  await email.fill('demo@hotmial.com');
  await page.getByRole('button', { name: 'Usar demo@hotmail.com', exact: true }).click();
  await expect(email).toHaveValue('demo@hotmail.com');
  await email.fill('demo@miempresa.do');
  await expect(page.locator('#email-hint')).toBeHidden();
});

test('Logos ilustrativos, aviso ficticio y diseño sin desbordamiento', async ({ page }) => {
  advice('Revisar anchos de la galería en móvil y fuentes locales de los identificadores visuales.');
  await choose(page, ['Salud', 'Vida', 'Vehículo']);
  await expect(page.locator('.notice')).toContainText('PRUEBA FICTICIA');
  const images = page.locator('.insurer-logo');
  await expect(images).toHaveCount(4);
  await expect.poll(() => images.evaluateAll(items => items.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const cards = await page.locator('.insurer-card').evaluateAll(items => items.map(item => { const rect = item.getBoundingClientRect(); return { x: rect.x, right: rect.right, y: rect.y }; }));
  expect(cards.every(card => card.x >= 0 && card.right <= page.viewportSize().width + 1)).toBe(true);
});

test('Tarjetas accesibles por teclado', async ({ page }) => {
  test.skip(test.info().project.name === 'movil', 'El teclado se comprueba en escritorio; el móvil usa interacción táctil.');
  advice('Conservar foco y soporte Enter/Espacio aunque se oculten las casillas visuales.');
  await choose(page, ['Vida']);
  const card = page.locator('[data-company=mapfre]');
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveClass(/chosen-insurer/);
  await page.keyboard.press('Space');
  await expect(card).not.toHaveClass(/chosen-insurer/);
});
