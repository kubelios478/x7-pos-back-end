## Informe de Sprint 1: Implementación de Módulos de Gestión de Inventario (Productos y Categorías)

Como parte de la metodología Scrum, en este Sprint 1 nos hemos enfocado en la implementación de los módulos de `Product` y `Category`, componentes fundamentales para la gestión de inventario del sistema.

### Módulo de Categorías

**Objetivo:** Desarrollar un subsistema para la organización jerárquica de productos.

**Aspectos Clave Implementados:**
*   **Entidad `Category`:** Definición de la estructura de datos con `id`, `name` (único por comerciante), `merchantId`, `parentId` (para jerarquía) e `isActive` (soft-delete).
*   **Servicio `CategoryService`:** Lógica de negocio para el CRUD de categorías. Incluye validaciones de autorización, unicidad y existencia de relaciones (comerciante, categoría padre). Se implementó soft-delete recursivo para subcategorías.

### Módulo de Productos

**Objetivo:** Implementar la gestión de artículos individuales del inventario.

**Aspectos Clave Implementados:**
*   **Entidad `Product`:** Diseño de la estructura de datos con `id`, `name`, `sku` (único por comerciante/categoría), `basePrice`, `merchantId`, `categoryId`, `supplierId` (opcional) e `isActive` (soft-delete).
*   **Servicio `ProductsService`:** Lógica de negocio para el CRUD de productos. Incluye validaciones de autorización, unicidad del `sku` y existencia de relaciones (comerciante, categoría, proveedor). Se implementó soft-delete.

**Conclusión:**
Este sprint ha sentado las bases para una gestión de inventario robusta, aplicando principios de diseño de software y validaciones de negocio esenciales.

---

### Evidencias Sugeridas (Capturas de Pantalla)

Para complementar este informe, se sugiere adjuntar las siguientes capturas de pantalla:

1.  **Estructura de Archivos:** Explorador de VS Code mostrando `src/products-inventory/category` y `src/products-inventory/products` (`.entity.ts`, `.service.ts`, `.controller.ts`).
2.  **Definición de Entidades:** Archivos `category.entity.ts` y `product.entity.ts` para mostrar la definición de tablas y relaciones.
3.  **Lógica de Creación (Servicios):** Métodos `create` en `category.service.ts` y `products.service.ts`, destacando validaciones y persistencia.
4.  **Pruebas de API (Postman/Swagger):**
    *   Solicitudes POST exitosas para crear categorías y productos, con sus respuestas JSON.
    *   Solicitudes GET para listar categorías y productos, con sus respuestas JSON.
    *   Ejemplos de validaciones (ej. creación con datos duplicados o sin permisos).
5.  **Base de Datos (Opcional):** Tablas `category` y `product` en una herramienta de gestión de bases de datos, mostrando registros y el estado `isActive`.
