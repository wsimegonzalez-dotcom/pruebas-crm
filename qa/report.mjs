import fs from 'node:fs';
const location = 'results/report.json';
if (!fs.existsSync(location)) {
  const message = '# Bot de pruebas CRM\n\nNo se generó un resultado. La instalación o el inicio del navegador falló; revisa el registro de ejecución.\n';
  fs.mkdirSync('results', { recursive: true });
  fs.writeFileSync('results/resumen.md', message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
  console.error(message);
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(location, 'utf8'));
const stats = report.stats || {};
const cases = [];
function visit(suite) {
  for (const spec of suite.specs || []) for (const test of spec.tests || []) cases.push({ spec, test });
  for (const child of suite.suites || []) visit(child);
}
for (const suite of report.suites || []) visit(suite);
const lines = ['# Bot de pruebas CRM', '', `Aprobadas: **${stats.expected || 0}** · Fallidas: **${stats.unexpected || 0}** · Inestables: **${stats.flaky || 0}** · Omitidas: **${stats.skipped || 0}**`, '', 'Solo se prueban la demostración estática y datos ficticios. Este informe no verifica ofertas de aseguradoras ni la seguridad del CRM de producción.', ''];
for (const { spec, test } of cases) {
  if (!['unexpected', 'flaky'].includes(test.status)) continue;
  lines.push(`## ${test.projectName}: ${spec.title}`, '', `Resultado: ${test.status === 'flaky' ? 'inestable; necesitó reintento' : 'falló'}.`, '');
  const result = [...(test.results || [])].reverse().find(result => result.status !== 'passed');
  const message = result?.errors?.map(error => error.message).join('\n') || 'Revisa la captura y la traza del navegador.';
  lines.push('```text', message.replace(/\u001b\[[0-9;]*m/g, '').replaceAll('```', "''' ").slice(0, 2500), '```', '');
  for (const annotation of test.annotations || []) if (annotation.type === 'correccion_sugerida') lines.push(`**Revisión sugerida:** ${annotation.description}`, '');
}
for (const error of report.errors || []) lines.push('## Error de infraestructura', '', String(error.message || 'Error sin detalle').slice(0, 2000), '');
const skipped = cases.filter(({ test }) => test.status === 'skipped');
if (skipped.length) {
  lines.push('## Pruebas omitidas', '');
  for (const { spec, test } of skipped) lines.push(`- ${test.projectName}: ${spec.title}. ${test.annotations?.find(annotation => annotation.type === 'skip')?.description || ''}`);
  lines.push('');
}
if (!stats.unexpected && !stats.flaky && !(report.errors || []).length) lines.push('Las comprobaciones ejecutadas no detectaron errores. Las pruebas omitidas no se cuentan como aprobadas.', '');
lines.push('## Evidencia', '', 'El artefacto de GitHub incluye este resumen, el informe HTML/JSON y las capturas o trazas de las pruebas fallidas. Las sugerencias son reglas de diagnóstico del bot; requieren comprobación antes de modificar código.', '');
const output = lines.join('\n');
fs.writeFileSync('results/resumen.md', output);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
console.log(output);
