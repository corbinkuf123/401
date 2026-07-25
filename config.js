/* ─────────────────────────────────────────────────────────────
   Configuración de Supabase para Pabellón 414.
   La "anon key" es pública por diseño: puede vivir en el frontend.
   La seguridad real la dan las políticas RLS de la base.
   ───────────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://ffsafqgzggysvxumwemh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmc2FmcWd6Z2d5c3Z4dW13ZW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjUxNzAsImV4cCI6MjEwMDU0MTE3MH0.uJtLdBPdE4QQsyHdKSw3zcfq7Ey9ux_VhEEG3SuEEec";

/* cliente global, lo usan index.html y admin.html */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Convierte una fila de la base (snake_case + jsonb) al formato
   que ya espera la UI pública (camelCase + fotos como array). */
function mapPieza(r){
  const imgs = (r.imagenes || [])
    .slice()
    .sort((a,b)=>(a.orden||0)-(b.orden||0))
    .map(x=>x.url);
  return {
    id: r.id,
    codigo: r.codigo || "",
    nombreComun: r.nombre_comun || "",
    nombreCientifico: r.nombre_cientifico || "",
    especie: r.especie || "",
    continente: r.continente || "",
    pais: r.pais || "",
    anio: r.anio || null,
    region: r.region || "",
    sala: r.sala || "",
    ubicacionActual: r.ubicacion_actual || "",
    estadoPieza: r.estado_pieza || "",
    bio: r.bio || {},
    caza: r.caza || {},
    taxidermia: r.taxidermia || {},
    documentos: r.documentos || "",
    historia: r.historia || "",
    pull: r.pull || "",
    imagenes: imgs,
    fotos: imgs.length
  };
}

/* Lee todas las piezas (con sus fotos) para la vista pública. */
async function fetchPiezas(){
  const { data, error } = await sb
    .from("piezas")
    .select("*, imagenes(url,orden)")
    .order("orden_display", { ascending: true });
  if(error){ console.error("Error cargando piezas:", error); return []; }
  return (data || []).map(mapPieza);
}
