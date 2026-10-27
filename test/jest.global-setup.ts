// test/jest.global-setup.ts
//
// Zona horaria fija para los tests unitarios, al oeste de UTC: así un desfase de fecha
// (p. ej. un DATE guardado un día antes) aparece en cualquier máquina, incluida la de CI
// (UTC). Se fija aquí, antes de crear los workers: dentro de un test, asignar
// process.env.TZ no tiene efecto porque Jest le da a cada archivo una copia del entorno.
export default function globalSetup(): void {
  process.env.TZ = 'America/Los_Angeles';
}
