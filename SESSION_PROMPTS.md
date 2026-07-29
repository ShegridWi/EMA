# Prompts de continuación — EMA

Guion de prompts para avanzar el proyecto **EMA (Euforia Moda Administrator)**
en sesiones separadas de Claude Code, uno por rama/fase. Copia y pega el
prompt de la fase que toca como primer mensaje de una sesión nueva. Cada uno
asume que las fases anteriores ya están mergeadas a `main`.

Repo: `git@github.com:ShegridWi/EMA.git` · Ruta local:
`c:\Users\Amilkar Contreras\Desktop\SistemaGalarza`

No lo edites para "corregir" el orden salvo que también actualices el
siguiente prompt sin usar todavía — cada uno asume el estado dejado por el
anterior.

---

## 1. `feature/db-schema` — Modelo de datos (YA CREADA)

```
Estoy retomando el proyecto EMA (Euforia Moda Administrator) — sistema de
control de inventario y ventas para Euforia Moda, un negocio familiar que
confecciona y vende pijamas médicas (La Paz y Santa Cruz, Bolivia).

Ruta del proyecto: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git (rama actual de trabajo: feature/db-schema)

Antes de hacer nada, lee CLAUDE.md y todo .claude/docs/ (incluye
05-nextjs-conventions.md) y AGENTS.md.

Estado actual (ya hecho, no repetir): Next.js 16 + TS + Tailwind escafoldado
con todo el stack instalado (Prisma 7 + @prisma/adapter-pg, next-auth@beta,
zod, next-intl, next-themes, nodemailer, @react-pdf/renderer, vitest).
docker-compose.yml levanta Postgres local (proyecto "ema", contenedor
ema-db-1), DATABASE_URL en .env ya apunta ahí. prisma/schema.prisma solo
tiene datasource/generator, SIN modelos. lib/db.ts tiene el singleton de
Prisma con el driver adapter. Git/GitHub ya configurados (SSH id_ed25519,
cuenta ShegridWi). Hay un commit inicial en main.

TAREA: Implementar en prisma/schema.prisma los modelos de
.claude/docs/02-data-model.md (User, Material, Product, Sale, MovementLog,
enums Role/City/ProductKind/PieceRole/SaleType/PaymentMethod) y sus
relaciones (Product SET → UNIT self-relation). Luego:
1. npx prisma migrate dev --name init
2. npx prisma generate
3. Verificar que npm run build sigue pasando.

Antes de correr la migración, si hay algo ambiguo revisa "Supuestos que hay
que confirmar con el negocio" en .claude/docs/04-scope-mvp.md (Pedido vs
Reserva, campo calculado de Set, etc.) y pregúntame.

Reglas (CLAUDE.md sección 7): soft delete en toda entidad borrable, sin
`any` sin justificar. Este paso es solo schema — el resto de reglas
(funciones centralizadas + audit log, tests para dinero) empiezan a aplicar
desde la fase de Materiales en adelante, pero el modelo debe soportarlas.

Cuando termines: commit, push a origin/feature/db-schema, y abre PR contra
main (o dime si prefieres que yo la mergee directo).
```

---

## 2. `feature/auth-shell` — Auth, layout, i18n, tema

```
Continúo EMA (Euforia Moda Administrator). Ruta:
c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — crea y trabaja en la rama
feature/auth-shell desde main (feature/db-schema ya fue mergeada).

Lee CLAUDE.md y .claude/docs/ (especialmente 03-roles-permissions.md y
05-nextjs-conventions.md) antes de empezar.

Estado actual: prisma/schema.prisma ya tiene todos los modelos migrados
(User con role ADMIN/SELLER y city). Falta todo lo de autenticación y el
shell de la app.

TAREA:
1. lib/auth.ts — Auth.js (next-auth@beta) con Credentials provider
   (email+password contra User.passwordHash), sesión con role y city.
2. Seed inicial: prisma/seed.ts que cree un usuario ADMIN de prueba
   (password hasheado). Documenta las credenciales en el propio script o
   en un comentario, nunca en texto plano en el repo fuera de ahí.
3. Rutas: app/(auth)/login (formulario de login) y app/(dashboard)/...
   como layout protegido — usa middleware.ts para redirigir no
   autenticados a login, pero recuerda que la validación de rol real va
   en cada Server Action más adelante (el middleware es UX, no seguridad
   de backend — CLAUDE.md sección 7).
4. next-intl: estructura app/[locale]/..., es como default, en como
   segundo idioma, messages/es.json y messages/en.json con las strings
   mínimas de login/nav.
5. next-themes: ThemeProvider en el layout raíz + toggle claro/oscuro.
6. Shell del dashboard: nav lateral/superior responsive con los módulos
   de 03-roles-permissions.md (aunque las páginas todavía no existan,
   los links pueden apuntar a rutas que se crean en fases siguientes).

Verifica con npm run build y npm run dev que el login real funciona contra
la base de datos local (docker compose up -d si no está corriendo).

Cuando termines: commit, push, PR contra main.
```

---

## 3. `feature/materials-crud` — CRUD de Confección

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/materials-crud desde
main (feature/db-schema y feature/auth-shell ya mergeadas).

Lee CLAUDE.md, .claude/docs/01-business-rules.md sección 1,
02-data-model.md (Material), 05-nextjs-conventions.md, y el skill
new-server-action (.claude/skills/new-server-action/SKILL.md) — este es el
primer módulo real, establece el patrón que se reutiliza en todo lo
siguiente.

Estado actual: login y roles funcionando, shell del dashboard con i18n y
tema. Sin ninguna página de negocio todavía.

TAREA:
1. lib/audit.ts — función centralizada para escribir MovementLog.
2. lib/inventory.ts — createMaterial/updateMaterial/deleteMaterial
   (soft delete), cada una en un prisma.$transaction que también escribe
   el audit log. Ninguna otra parte del código debe tocar
   prisma.material.* directamente.
3. lib/validations/material.ts — Zod schema.
4. lib/actions/materials.ts — Server Actions siguiendo el patrón obligatorio
   (auth() + chequeo de rol ADMIN para escritura, ambos roles para
   lectura; ver 05-nextjs-conventions.md).
5. app/(dashboard)/inventory/materials — listado (ambos roles, con
   búsqueda, excluye soft-deleted), formulario alta/edición/borrado
   (solo admin, oculto en UI para seller pero la Server Action igual
   valida el rol).

Al terminar, corre el skill nextjs-architecture-review sobre lo que
escribiste antes de dar por cerrado el módulo.

Cuando termines: commit, push, PR contra main.
```

---

## 4. `feature/products-crud` — CRUD de Producto terminado

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/products-crud desde
main (materials-crud ya mergeada, mismo patrón a reutilizar).

Lee CLAUDE.md, .claude/docs/01-business-rules.md sección 2 (Producto
terminado: conjuntos vs piezas) y 02-data-model.md (Product).

Estado actual: patrón Server Action + función centralizada + audit log ya
probado con Materiales. Repite la misma estructura para Product.

TAREA:
1. Extender lib/inventory.ts con createProduct/updateProduct/deleteProduct.
   Al crear un SET: crear automáticamente los Product hijos (kind=UNIT,
   setId apuntando al padre, pieceRole TOP/BOTTOM/CAP) en la misma
   transacción, en cantidad 0 o la indicada — ver
   01-business-rules.md sección 2 para el flujo exacto.
2. lib/validations/product.ts, lib/actions/products.ts (mismo patrón que
   materials, con el caso extra de "crear conjunto" pidiendo cuántas
   piezas y cuáles).
3. app/(dashboard)/inventory/products — listado (ambos roles), alta/edición
   (solo admin), con la UI diferenciando conjunto vs pieza suelta.

Antes de escribir la lógica de "cuántos conjuntos completos tengo", revisa
el supuesto abierto #2 en .claude/docs/04-scope-mvp.md y pregúntame si no
está resuelto todavía — no lo asumas.

Corre nextjs-architecture-review antes de cerrar. Commit, push, PR contra
main al terminar.
```

---

## 5. `feature/sales` — Registro de venta

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/sales desde main
(materials-crud y products-crud ya mergeadas).

Lee CLAUDE.md, .claude/docs/01-business-rules.md sección 3 (Venta) y
02-data-model.md (Sale). Esta fase TOCA DINERO — CLAUDE.md sección 7 exige
tests con Vitest antes de mergear, sin excepción.

Estado actual: Material y Product CRUD funcionando con el patrón
centralizado + audit log.

TAREA:
1. Antes de codear, confírmame si ya están resueltos los supuestos #1
   (Pedido vs Reserva, ¿son lo mismo?) y #4 (¿se registra cliente?) de
   .claude/docs/04-scope-mvp.md — si no, pregúntame y actualiza ese doc
   con la respuesta antes de seguir.
2. lib/inventory.ts: función para registrar venta que en una sola
   transacción: descuenta stock (la pieza si es unidad, o cada pieza
   correspondiente si es conjunto completo), crea el Sale, y escribe el
   MovementLog. Debe fallar limpio si no hay stock suficiente.
3. lib/validations/sale.ts, lib/actions/sales.ts (patrón habitual).
4. app/(dashboard)/sales — formulario de venta (producto, color, talla,
   cantidad, precio, método de pago QR/efectivo, tipo de venta
   contado/pedido/reserva), historial (seller ve el suyo, admin ve todos).
5. tests/sales.test.ts (Vitest) cubriendo: cálculo de totalPrice/balanceDue,
   descuento de stock unidad vs conjunto, y el caso de stock insuficiente.

No merges esta rama sin los tests pasando. Commit, push, PR contra main al
terminar.
```

---

## 6. `feature/users-admin` — Gestión de usuarios

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/users-admin desde
main (sales ya mergeada).

Lee CLAUDE.md y .claude/docs/03-roles-permissions.md (módulo Usuarios).

Estado actual: solo existe el usuario admin del seed inicial
(prisma/seed.ts). Sin UI para crear más usuarios.

TAREA: lib/actions/users.ts (crear/editar/desactivar usuarios — desactivar
es soft delete: active=false, nunca borrar filas), validación server-side
de rol ADMIN en todas las acciones, hash de password al crear/cambiar.
app/(dashboard)/users — listado (admin only), alta/edición de
admins/sellers con asignación de role y city.

Mismo patrón de siempre (Server Action + Zod + función centralizada +
audit log). Corre nextjs-architecture-review antes de cerrar. Commit,
push, PR contra main.
```

---

## 7. `feature/movement-log` — Vista del log de auditoría

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/movement-log desde
main (users-admin ya mergeada).

Lee CLAUDE.md y .claude/docs/01-business-rules.md sección 6.

Estado actual: todas las fases anteriores (materials, products, sales,
users) ya escriben MovementLog vía las funciones centralizadas. Esta fase
es solo la vista de lectura, no lógica nueva de escritura.

TAREA: app/(dashboard)/movement-log — página admin-only con listado
paginado del MovementLog, filtros por rango de fecha, entityType y
usuario. Sin CRUD, es de solo lectura.

Commit, push, PR contra main al terminar.
```

---

## 8. `feature/reports` — Reportes manual y semanal automático

```
Continúo EMA. Ruta: c:\Users\Amilkar Contreras\Desktop\SistemaGalarza
Repo: git@github.com:ShegridWi/EMA.git — rama feature/reports desde main
(movement-log ya mergeada). Última fase del MVP.

Lee CLAUDE.md, .claude/docs/01-business-rules.md sección 7, y
05-nextjs-conventions.md (secciones de PDF, email y "Weekly report
scheduling").

Estado actual: sistema completo (materials, products, sales, users,
movement log) con datos reales en la base local.

TAREA:
1. Confirma primero el supuesto #7 de .claude/docs/04-scope-mvp.md (a qué
   correo(s) llega el reporte semanal) — pregúntame si sigue sin resolver.
2. Reporte manual: app/(dashboard)/reports — admin elige rango de fechas,
   genera PDF (ventas + inventario) con @react-pdf/renderer, botón de
   descarga.
3. Reporte automático: app/api/cron/weekly-report — valida CRON_SECRET,
   reutiliza la misma lógica de generación de PDF que el manual, envía por
   Nodemailer a los admins. No implementes el scheduler en sí (eso es
   infra/deploy, ver la sección correspondiente en
   05-nextjs-conventions.md) — solo el endpoint protegido.
4. tests/reports.test.ts (Vitest) para el cálculo de totales del reporte
   (toca dinero → obligatorio).

Commit, push, PR contra main. Con esto se cierra el MVP completo de
.claude/docs/04-scope-mvp.md — al final haz un repaso de qué quedó
pendiente o con TODOs.
```
