# Finanzas Personales — Roadmap

## Fase 1 — Base (semana 1-2)
- [ ] Setup Supabase (ejecutar schema.sql + seed.sql)
- [ ] Auth: login, registro, recuperar contraseña
- [ ] Layout principal: sidebar desktop + bottom nav mobile
- [ ] CRUD Cuentas bancarias
- [ ] CRUD Categorías y subcategorías
- [ ] Tipo de cambio: integración API MEP/CCL + fallback manual

## Fase 2 — Movimientos (semana 2-3)
- [ ] Listado de transacciones con filtros (fecha, tipo, categoría)
- [ ] Formulario nuevo movimiento (mobile-friendly, conversión dual automática)
- [ ] Movimientos recurrentes
- [ ] Transferencias entre cuentas propias
- [ ] Foto de comprobante (Supabase Storage)

## Fase 3 — Tarjetas de Crédito (semana 3-4)
- [ ] CRUD tarjetas de crédito
- [ ] Registro de gastos con cuotas
- [ ] Resumen mensual por tarjeta
- [ ] Vista de cuotas futuras comprometidas

## Fase 4 — Inversiones (semana 4-5)
- [ ] CRUD posiciones de inversión
- [ ] Historial de operaciones (trades)
- [ ] Actualización de precios: Yahoo Finance + CoinGecko
- [ ] Precio manual para activos sin ticker
- [ ] Plazo fijo con TNA y vencimiento
- [ ] Portfolio view consolidado

## Fase 5 — Dashboard & Proyectos (semana 5-6)
- [ ] Dashboard principal con KPIs
- [ ] Net worth mensual (gráfico histórico)
- [ ] Cashflow mensual (ingresos vs gastos)
- [ ] Proyectos de ahorro y gasto
- [ ] Módulo cobros pendientes (terceros)

## Fase 6 — Alertas & PWA (semana 6-7)
- [ ] Sistema de alertas (vencimientos, gasto > ingreso)
- [ ] PWA: manifest.json, service worker, instalable en mobile
- [ ] Optimización mobile: carga rápida de gastos
- [ ] Dark mode

## Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Estilos**: Tailwind CSS v4
- **UI**: Componentes propios + Lucide React
- **Gráficos**: Recharts
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel
- **Formularios**: React Hook Form + Zod
- **Notificaciones**: Sonner
