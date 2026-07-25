-- ============================================================
--  PABELLÓN 414 · Esquema de base de datos (Supabase / Postgres)
-- ============================================================
--  Cómo usarlo:
--    Supabase → SQL Editor → New query → pegar todo → Run.
--  Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ---------- 1. TABLA DE PIEZAS ----------
create table if not exists public.piezas (
  id                 text primary key,            -- slug estable usado en la URL/QR: /#/pieza/<id>
  codigo             text,                         -- ej: DAM-001
  nombre_comun       text not null,
  nombre_cientifico  text,
  especie            text,
  continente         text,
  pais               text,
  anio               integer,
  region             text,
  sala               text,                         -- ubicación "de catálogo" (sector/pared)
  ubicacion_actual   text,                         -- ubicación física actual (NUEVO, admin)
  estado_pieza       text default 'Bueno',         -- condición: Excelente / Bueno / Requiere atención (NUEVO)
  bio                jsonb  default '{}'::jsonb,    -- {clase,orden,familia,distribucion,habitat,estado}
  caza               jsonb  default '{}'::jsonb,    -- {fecha,operador,modalidad,distancia,arma,calibre}
  taxidermia         jsonb  default '{}'::jsonb,    -- {fecha,taller,observaciones}
  documentos         text,                          -- separados por ";"
  historia           text,
  pull               text,                          -- frase destacada opcional
  orden_display      integer default 0,             -- para ordenar la colección
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ---------- 2. IMÁGENES (3-4 por pieza) ----------
create table if not exists public.imagenes (
  id          uuid primary key default gen_random_uuid(),
  pieza_id    text not null references public.piezas(id) on delete cascade,
  storage_path text not null,                       -- ruta dentro del bucket de Storage
  url         text not null,                        -- URL pública para mostrar
  orden       integer default 0,                    -- 1 = foto principal
  created_at  timestamptz default now()
);
create index if not exists idx_imagenes_pieza on public.imagenes(pieza_id);

-- ---------- 3. MANTENIMIENTOS (por pieza: programados + realizados) ----------
create table if not exists public.mantenimientos (
  id                uuid primary key default gen_random_uuid(),
  pieza_id          text not null references public.piezas(id) on delete cascade,
  tipo              text,                             -- ej: Limpieza, Restauración, Inspección, Fumigación
  descripcion       text,
  responsable       text,
  estado            text default 'programado',        -- 'programado' | 'realizado'
  fecha_programada  date,                             -- cuándo toca hacerlo (próximo mantenimiento)
  fecha_realizado   date,                             -- cuándo se hizo efectivamente
  created_at        timestamptz default now()
);
create index if not exists idx_mant_pieza   on public.mantenimientos(pieza_id);
create index if not exists idx_mant_estado  on public.mantenimientos(estado, fecha_programada);

-- ---------- 3b. NOTAS (bitácora libre por pieza) ----------
create table if not exists public.notas (
  id          uuid primary key default gen_random_uuid(),
  pieza_id    text not null references public.piezas(id) on delete cascade,
  texto       text not null,
  autor       text,
  created_at  timestamptz default now()
);
create index if not exists idx_notas_pieza on public.notas(pieza_id);

-- ---------- 4. updated_at automático ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_piezas_touch on public.piezas;
create trigger trg_piezas_touch before update on public.piezas
  for each row execute function public.touch_updated_at();

-- ============================================================
--  SEGURIDAD (RLS): el público SOLO LEE, el admin logueado escribe
-- ============================================================
alter table public.piezas        enable row level security;
alter table public.imagenes      enable row level security;
alter table public.mantenimientos enable row level security;
alter table public.notas         enable row level security;

-- Lectura pública (visitantes que escanean el QR)
drop policy if exists "lectura publica piezas" on public.piezas;
create policy "lectura publica piezas" on public.piezas
  for select using (true);

drop policy if exists "lectura publica imagenes" on public.imagenes;
create policy "lectura publica imagenes" on public.imagenes
  for select using (true);

-- Los mantenimientos y notas NO son públicos: solo el admin logueado
drop policy if exists "mantenimientos solo admin" on public.mantenimientos;
create policy "mantenimientos solo admin" on public.mantenimientos
  for select using (auth.role() = 'authenticated');

drop policy if exists "notas solo admin lectura" on public.notas;
create policy "notas solo admin lectura" on public.notas
  for select using (auth.role() = 'authenticated');

drop policy if exists "escritura admin notas" on public.notas;
create policy "escritura admin notas" on public.notas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
--  STORAGE: bucket para las fotos de las piezas
-- ============================================================
insert into storage.buckets (id, name, public)
values ('piezas', 'piezas', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos (visitantes con QR)
drop policy if exists "lectura publica fotos" on storage.objects;
create policy "lectura publica fotos" on storage.objects
  for select using (bucket_id = 'piezas');

-- Subir / reemplazar / borrar fotos: solo el admin logueado
drop policy if exists "subida admin fotos" on storage.objects;
create policy "subida admin fotos" on storage.objects
  for insert with check (bucket_id = 'piezas' and auth.role() = 'authenticated');

drop policy if exists "update admin fotos" on storage.objects;
create policy "update admin fotos" on storage.objects
  for update using (bucket_id = 'piezas' and auth.role() = 'authenticated');

drop policy if exists "delete admin fotos" on storage.objects;
create policy "delete admin fotos" on storage.objects
  for delete using (bucket_id = 'piezas' and auth.role() = 'authenticated');

-- Escritura (crear/editar/borrar): solo usuarios autenticados
drop policy if exists "escritura admin piezas" on public.piezas;
create policy "escritura admin piezas" on public.piezas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "escritura admin imagenes" on public.imagenes;
create policy "escritura admin imagenes" on public.imagenes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "escritura admin mantenimientos" on public.mantenimientos;
create policy "escritura admin mantenimientos" on public.mantenimientos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
