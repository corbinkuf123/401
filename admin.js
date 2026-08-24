/* ═══════════════════════════════════════════════════════════════
   PABELLÓN 414 · Panel de administración
   Usa el cliente `sb` y helpers definidos en config.js
   ═══════════════════════════════════════════════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let PIEZAS = [];          // piezas para la lista de edición
let MANT_PIEZAS = [];      // piezas para la sección de mantenimiento
let currentId = null;     // id de la pieza en edición (null = nueva)
let currentImgs = [];     // imágenes guardadas de la pieza en edición
let pendingFiles = [];    // fotos elegidas para una pieza nueva (se suben al guardar)
let mSelId = null;        // pieza seleccionada en la sección de mantenimiento
let mantEditId = null;    // mantenimiento en edición dentro del modal

/* ---------- utilidades ---------- */
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),2200);}
function slugify(s){return (s||"pieza").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"pieza";}
function rand(n){return Math.random().toString(36).slice(2,2+n);}
function estadoClass(e){return e==="Excelente"?"ex":e==="Requiere atención"?"at":e==="En restauración"?"re":"";}
function fmtDate(d){if(!d)return"";const p=d.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d;}
function today(){return new Date().toISOString().slice(0,10);}

/* ---------- desplegables (opciones fijas + "Otro…" para valores nuevos) ---------- */
const SEL = {
  f_especie: ["Antílope","Ave galliforme","Bóvido","Caprino salvaje","Cérvido","Équido","Felino","Gacela","Ovino","Ovino salvaje","Perisodáctilo","Reptil cocodrílido","Suido","Úrsido"],
  f_continente: ["África","América","América del Norte","América del Sur","Asia","Europa","Europa / Asia","Oceanía"],
  f_sala: ["Sector 1 – Salón Principal Pared Oeste","Sector 1 – Salón Principal Pared Este","Sector 1 – Salón Principal Pared Sur","Sector 1 – Zona Escaleras","Sector 2 – Comedor","Sector 3 – Segundo Piso","Sector 4 – Oficina / Hall","Sector 5 – Entrada Exterior","Sector 6 – Patio Interior"],
  f_caza_modalidad: ["Rececho","Espera / Aguardo","Batida / Montería","Al salto","Desde vehículo","Varias"]
};
function initSelects(){
  Object.entries(SEL).forEach(([id,vals])=>{
    const s=$("#"+id); if(!s) return;
    s.innerHTML=`<option value="">— seleccionar —</option>`+vals.map(v=>`<option value="${v}">${v}</option>`).join("")+`<option value="__otro__">Otro…</option>`;
    s.addEventListener("change",()=>{
      const txt=$("#"+id+"_txt"); if(!txt) return;
      if(s.value==="__otro__"){ txt.classList.remove("hide"); txt.value=""; txt.focus(); }
      else txt.classList.add("hide");
    });
  });
}
function setSelVal(id,val){
  const s=$("#"+id), txt=$("#"+id+"_txt"); if(!s) return;
  if(txt){ txt.classList.add("hide"); txt.value=""; }
  if(!val){ s.value=""; return; }
  if(![...s.options].some(o=>o.value===val)){ const o=document.createElement("option"); o.value=val; o.textContent=val; s.insertBefore(o,s.lastElementChild); }
  s.value=val;
}
function getSelVal(id){
  const s=$("#"+id); if(!s) return "";
  if(s.value==="__otro__"){ const txt=$("#"+id+"_txt"); return txt?(txt.value||"").trim():""; }
  return s.value;
}
initSelects();

/* ═══════════════ AUTENTICACIÓN ═══════════════ */
$("#loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const btn=$("#loginBtn"), msg=$("#loginMsg");
  btn.disabled=true; btn.innerHTML='<span class="spin"></span>'; msg.className="msg"; msg.textContent="";
  const { error } = await sb.auth.signInWithPassword({ email:$("#email").value.trim(), password:$("#pass").value });
  btn.disabled=false; btn.textContent="Ingresar";
  if(error){ msg.className="msg err"; msg.textContent="Correo o contraseña incorrectos."; }
});
$("#logoutBtn").addEventListener("click", async ()=>{ await sb.auth.signOut(); });

sb.auth.onAuthStateChange((_e, session)=>{
  if(session){ showApp(); } else { $("#app").classList.add("hide"); $("#login").classList.remove("hide"); }
});
sb.auth.getSession().then(({data})=>{ if(data.session) showApp(); });

async function showApp(){
  $("#login").classList.add("hide");
  $("#app").classList.remove("hide");
  const deep = location.hash.match(/^#pieza=(.+)$/);
  await loadList();
  if(deep){                                   // deep-link desde el sitio público
    setNav("piezas");
    openEditor(decodeURIComponent(deep[1]));
    history.replaceState(null,"","admin.html");
  }else{
    setNav("inicio"); showSection("homeView"); loadHome();
  }
}

/* ═══════════════ NAVEGACIÓN PRINCIPAL ═══════════════ */
function showSection(name){
  ["homeView","listView","editView","mantListView","mantDetailView"].forEach(v=>$("#"+v).classList.toggle("hide", v!==name));
  window.scrollTo(0,0);
}
function setNav(which){
  $("#navInicio").classList.toggle("on",which==="inicio");
  $("#navPiezas").classList.toggle("on",which==="piezas");
  $("#navMant").classList.toggle("on",which==="mant");
}
$("#navInicio").addEventListener("click", ()=>{ setNav("inicio"); showSection("homeView"); loadHome(); });
$("#navPiezas").addEventListener("click", ()=>{ setNav("piezas"); showSection("listView"); loadList(); });
$("#navMant").addEventListener("click", ()=>{ setNav("mant"); showSection("mantListView"); enterMant(); });
/* El pliego de QR es una página aparte (se imprime), así que abre en otra pestaña
   y no cambia la sección activa del panel. */
$("#navQR").addEventListener("click", ()=> window.open("qr.html","_blank"));

/* ═══════════════ INICIO / DASHBOARD ═══════════════ */
function hace(iso){
  if(!iso) return "";
  const d=new Date(iso), ahora=new Date(), min=Math.round((ahora-d)/60000);
  const hhmm=d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"});
  if(min<1) return "Recién";
  if(min<60) return `Hace ${min} min`;
  const mismoDia=d.toDateString()===ahora.toDateString();
  if(mismoDia) return `Hoy ${hhmm}`;
  const ayer=new Date(ahora); ayer.setDate(ahora.getDate()-1);
  if(d.toDateString()===ayer.toDateString()) return `Ayer ${hhmm}`;
  return d.toLocaleDateString("es",{day:"2-digit",month:"short",year:"numeric"});
}
async function loadHome(){
  const [pz,mt] = await Promise.all([
    sb.from("piezas").select("id,codigo,nombre_comun,estado_pieza,updated_at").order("updated_at",{ascending:false}),
    sb.from("mantenimientos").select("id,estado,fecha_programada")
  ]);
  const piezas=pz.data||[], mants=mt.data||[], hoy=today();
  const pend=mants.filter(m=>m.estado!=="realizado");
  const vencidos=pend.filter(m=>m.fecha_programada && m.fecha_programada<hoy).length;
  const enMes=pend.filter(m=>{
    if(!m.fecha_programada) return false;
    const lim=new Date(); lim.setDate(lim.getDate()+30);
    return m.fecha_programada>=hoy && m.fecha_programada<=lim.toISOString().slice(0,10);
  }).length;

  $("#homeKpis").innerHTML=`
    <button class="kpi click" onclick="irA('piezas')"><div class="n">${piezas.length}</div><div class="l">Total de trofeos</div></button>
    <button class="kpi click ${pend.length?"warn":""}" onclick="irA('mant')"><div class="n">${pend.length}</div><div class="l">Mantenimientos pendientes</div>
      ${pend.length?`<svg class="flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/></svg>`:""}</button>
    <button class="kpi click" onclick="irA('mant')"><div class="n">${enMes}</div><div class="l">Próximas tareas (30 días)</div></button>
    <button class="kpi click ${vencidos?"danger":""}" onclick="irA('mant')"><div class="n">${vencidos}</div><div class="l">Tareas vencidas</div></button>`;

  const act=piezas.slice(0,6);
  $("#homeAct").innerHTML = act.length
    ? act.map(p=>`<button class="act" onclick="openEditor('${p.id}')"><span class="code">${p.codigo||p.id}</span>
        <span class="txt">${p.nombre_comun||""} · actualizado</span>
        <span class="when">${hace(p.updated_at)}</span></button>`).join("")
    : `<div class="act"><span class="txt">Todavía no hay actividad. Empezá cargando una pieza.</span></div>`;
}
/* atajos desde el dashboard */
function irA(destino){
  if(destino==="piezas"){ setNav("piezas"); showSection("listView"); loadList(); }
  else { setNav("mant"); showSection("mantListView"); enterMant(); }
}
window.irA=irA;

/* ═══════════════ LISTA DE PIEZAS ═══════════════ */
async function loadList(){
  const { data, error } = await sb.from("piezas").select("*, imagenes(url,orden)").order("orden_display",{ascending:true});
  if(error){ toast("Error cargando piezas"); console.error(error); return; }
  PIEZAS = data||[];
  renderList();
}
function renderList(){
  const q=($("#adminSearch").value||"").toLowerCase();
  const list=PIEZAS.filter(p=>!q || (p.nombre_comun+" "+(p.codigo||"")+" "+(p.pais||"")+" "+(p.especie||"")).toLowerCase().includes(q));
  const rows=$("#rows");
  if(!list.length){ rows.innerHTML=`<div class="empty">${PIEZAS.length?"Sin resultados.":"Aún no hay piezas. Creá la primera con “+ Nueva pieza”."}</div>`; return; }
  rows.innerHTML=list.map(p=>{
    const img=(p.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0))[0];
    const est=p.estado_pieza||"Bueno";
    return `<div class="row" onclick="openEditor('${p.id}')">
      <div class="thumb">${img?`<img src="${img.url}" alt="">`:"—"}</div>
      <div class="info">
        <div class="nm">${p.nombre_comun||"(sin nombre)"}</div>
        <div class="sub">${[p.codigo,p.pais,p.especie].filter(Boolean).join(" · ")||"—"}</div>
      </div>
      <span class="pill ${estadoClass(est)}">${est}</span>
    </div>`;
  }).join("");
}
$("#adminSearch").addEventListener("input", renderList);
$("#newBtn").addEventListener("click", ()=>openEditor(null));

/* ═══════════════ EDITOR DE PIEZA ═══════════════ */
$("#backBtn").addEventListener("click", ()=>{ showSection("listView"); loadList(); });
$("#cancelBtn").addEventListener("click", ()=>{ showSection("listView"); loadList(); });

$$("#edTabs button").forEach(b=>b.addEventListener("click", ()=>goTab(b.dataset.t)));
function goTab(t){ $$("#edTabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t)); $$("#editView .pane").forEach(p=>p.classList.toggle("on",p.dataset.p===t)); if(t==="qr"&&currentId) renderQR(); }

const F = {
  scalar:["codigo","nombre_comun","nombre_cientifico","pais","region","ubicacion_actual","estado_pieza","documentos","historia"],
  bio:["clase","orden","familia","distribucion","habitat","estado"],
  caza:["fecha","operador","distancia","arma","calibre"],
  tax:["fecha","taller","observaciones"]
};

async function openEditor(id){
  // reset total del editor (evita arrastrar la pieza anterior)
  pendingFiles.forEach(pf=>URL.revokeObjectURL(pf.url)); pendingFiles=[];
  currentId=id; currentImgs=[];
  $("#thumbs").innerHTML="";
  const p = id ? PIEZAS.find(x=>x.id===id) : null;

  F.scalar.forEach(k=>{ const el=$("#f_"+k); if(el) el.value = p ? (p[k]??"") : ""; });
  if(!p) $("#f_estado_pieza").value="Bueno";
  $("#f_anio").value = p && p.anio!=null ? p.anio : "";
  F.bio.forEach(k=>$("#f_bio_"+k).value = p&&p.bio ? (p.bio[k]||"") : "");
  F.caza.forEach(k=>$("#f_caza_"+k).value = p&&p.caza ? (p.caza[k]||"") : "");
  F.tax.forEach(k=>$("#f_tax_"+k).value = p&&p.taxidermia ? (p.taxidermia[k]||"") : "");
  setSelVal("f_especie", p?p.especie:"");
  setSelVal("f_continente", p?p.continente:"");
  setSelVal("f_sala", p?p.sala:"");
  setSelVal("f_caza_modalidad", p&&p.caza?p.caza.modalidad:"");

  $("#edTitle").textContent = p ? p.nombre_comun : "Nueva pieza";
  $("#edSub").textContent = p ? (p.codigo||p.id) : "Completa los datos y guarda";
  $("#deleteBtn").classList.toggle("hide", !p);
  // El QR sí necesita que la pieza exista (usa su id en la URL)
  $("#qrLocked").classList.toggle("hide", !!p);
  $("#qrArea").classList.toggle("hide", !p);
  goTab("datos");
  setNav("piezas");
  showSection("editView");

  if(p){ await loadFotos(); renderQR(); }
  else { renderThumbs(); }
}
window.openEditor = openEditor;

/* Abrir el editor desde cualquier sitio (por ejemplo, desde la agenda de
   conservación). openEditor busca la pieza dentro de PIEZAS, así que si
   se entró directo a Conservación hay que cargar la lista antes. */
async function editarPieza(id){
  if(!PIEZAS.length) await loadList();
  await openEditor(id);
}
window.editarPieza = editarPieza;

function readForm(){
  const anio = $("#f_anio").value.trim();
  const obj = {
    codigo:$("#f_codigo").value.trim(),
    nombre_comun:$("#f_nombre_comun").value.trim(),
    nombre_cientifico:$("#f_nombre_cientifico").value.trim(),
    especie:getSelVal("f_especie"),
    continente:getSelVal("f_continente"),
    pais:$("#f_pais").value.trim(),
    anio: anio===""?null:parseInt(anio,10),
    region:$("#f_region").value.trim(),
    sala:getSelVal("f_sala"),
    ubicacion_actual:$("#f_ubicacion_actual").value.trim(),
    estado_pieza:$("#f_estado_pieza").value,
    documentos:$("#f_documentos").value.trim(),
    historia:$("#f_historia").value.trim(),
    bio:{}, caza:{}, taxidermia:{}
  };
  F.bio.forEach(k=>obj.bio[k]=$("#f_bio_"+k).value.trim());
  F.caza.forEach(k=>obj.caza[k]=$("#f_caza_"+k).value.trim());
  obj.caza.modalidad=getSelVal("f_caza_modalidad");
  F.tax.forEach(k=>obj.taxidermia[k]=$("#f_tax_"+k).value.trim());
  return obj;
}

$("#saveBtn").addEventListener("click", async ()=>{
  const body = readForm();
  if(!body.nombre_comun){ toast("El nombre común es obligatorio"); goTab("datos"); return; }
  const btn=$("#saveBtn"); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    if(currentId){
      const { error } = await sb.from("piezas").update(body).eq("id",currentId);
      if(error) throw error;
      toast("Cambios guardados");
    }else{
      let baseId = slugify(body.nombre_comun);
      let tryId = baseId, ok=false;
      for(let i=0;i<4 && !ok;i++){
        const { error } = await sb.from("piezas").insert({ ...body, id:tryId });
        if(!error){ ok=true; currentId=tryId; }
        else if(error.code==="23505"){ tryId = baseId+"-"+rand(3); }
        else throw error;
      }
      if(!ok) throw new Error("No se pudo generar un identificador único");
      // subir las fotos que se habían elegido antes de guardar
      if(pendingFiles.length){
        toast("Optimizando y subiendo fotos…");
        let orden=0, antes=0, despues=0;
        for(const pf of pendingFiles){
          try{ const r=await uploadOne(pf.file, orden++); antes+=r.antes; despues+=r.despues; }
          catch(e){ console.error(e); }
        }
        pendingFiles.forEach(pf=>URL.revokeObjectURL(pf.url)); pendingFiles=[];
        await loadFotos();
        if(antes>despues) toast(`Fotos optimizadas · ${peso(antes)} → ${peso(despues)}`);
      }
      $("#deleteBtn").classList.remove("hide");
      $("#edSub").textContent = body.codigo||currentId;
      $("#qrLocked").classList.add("hide"); $("#qrArea").classList.remove("hide");
      renderQR();
      toast("Pieza creada");
    }
    await loadList();
    $("#edTitle").textContent = body.nombre_comun;
  }catch(err){ console.error(err); toast("Error al guardar"); }
  btn.disabled=false; btn.textContent="Guardar";
});

$("#deleteBtn").addEventListener("click", async ()=>{
  if(!currentId) return;
  if(!confirm("¿Eliminar esta pieza y todas sus fotos, mantenimientos y notas? No se puede deshacer.")) return;
  const paths = currentImgs.map(i=>i.storage_path).filter(Boolean);
  if(paths.length) await sb.storage.from("piezas").remove(paths);
  const { error } = await sb.from("piezas").delete().eq("id",currentId);
  if(error){ toast("Error al eliminar"); return; }
  toast("Pieza eliminada"); showSection("listView"); loadList();
});

/* ═══════════════ FOTOS ═══════════════ */
async function loadFotos(){
  const { data, error } = await sb.from("imagenes").select("*").eq("pieza_id",currentId).order("orden",{ascending:true});
  if(error){ console.error(error); return; }
  currentImgs = data||[];
  renderThumbs();
}
function renderThumbs(){
  const c=$("#thumbs");
  if(currentId){
    c.innerHTML=currentImgs.map((im,i)=>`
      <div class="th">
        ${i===0?'<span class="badge">Principal</span>':''}
        <img src="${im.url}" alt="">
        <div class="tools">
          ${i>0?`<button onclick="moveImg('${im.id}',-1)" title="Subir">↑</button>`:''}
          ${i<currentImgs.length-1?`<button onclick="moveImg('${im.id}',1)" title="Bajar">↓</button>`:''}
          <button class="del" onclick="deleteImg('${im.id}')">Borrar</button>
        </div>
      </div>`).join("");
  }else{
    c.innerHTML=pendingFiles.map((pf,i)=>`
      <div class="th">
        ${i===0?'<span class="badge">Principal</span>':''}
        <img src="${pf.url}" alt="">
        <div class="tools"><button class="del" onclick="removePending('${pf.id}')">Quitar</button></div>
      </div>`).join("");
  }
}
$("#fileInput").addEventListener("change", e=>{ uploadFiles(e.target.files); e.target.value=""; });
const drop=$("#drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
drop.addEventListener("drop", e=>uploadFiles(e.dataTransfer.files));

/* ── Compresión antes de subir ─────────────────────────────────
   Una foto de celular pesa 3-5 MB. El plan gratuito de Supabase
   da 1 GB de almacenamiento y 5 GB de tráfico al mes.
   Reducirlas a 1600px de lado y recomprimirlas las deja en unos
   250 KB, sin diferencia visible en pantalla: ~16x más margen.
   Si algo falla, se sube el original y no se pierde nada.      */
const MAX_LADO = 1600;   // px del lado más largo
const CALIDAD  = 0.82;   // calidad JPEG

async function comprimir(file){
  if(!file.type.startsWith("image/")) return file;
  try{
    // createImageBitmap respeta la orientación EXIF del celular:
    // sin esto, las fotos verticales se suben acostadas.
    const bmp = await createImageBitmap(file, { imageOrientation:"from-image" });
    const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala), h = Math.round(bmp.height * escala);

    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", CALIDAD));
    if(!blob || blob.size >= file.size) return file;   // si no mejora, dejamos el original
    return new File([blob], file.name.replace(/\.[^.]+$/,"")+".jpg", { type:"image/jpeg" });
  }catch(e){
    console.warn("No se pudo comprimir, se sube el original:", e);
    return file;
  }
}

async function uploadOne(file, orden){
  const f = await comprimir(file);
  const ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${currentId}/${Date.now()}-${rand(4)}.${ext}`;
  // nombres únicos ⇒ la foto nunca cambia ⇒ se puede cachear un año
  const up=await sb.storage.from("piezas").upload(path,f,{cacheControl:"31536000",upsert:false});
  if(up.error) throw up.error;
  const url=sb.storage.from("piezas").getPublicUrl(path).data.publicUrl;
  const ins=await sb.from("imagenes").insert({pieza_id:currentId,storage_path:path,url,orden});
  if(ins.error) throw ins.error;
  return { antes:file.size, despues:f.size };   // para poder informar el ahorro
}

/* Tamaño legible: 480 KB, 2.4 MB… */
function peso(b){
  return b >= 1048576 ? (b/1048576).toFixed(1)+" MB" : Math.round(b/1024)+" KB";
}

async function uploadFiles(files){
  const arr=[...files].filter(f=>f.type.startsWith("image/"));
  if(!arr.length) return;
  // pieza aún no guardada: encolar y previsualizar; se suben al guardar
  if(!currentId){
    arr.forEach(f=>pendingFiles.push({file:f,url:URL.createObjectURL(f),id:rand(6)}));
    renderThumbs();
    toast(`${arr.length} foto(s) lista(s) · se subirán al guardar`);
    return;
  }
  toast(`Optimizando y subiendo ${arr.length} foto(s)…`);
  let orden = currentImgs.length ? Math.max(...currentImgs.map(i=>i.orden||0))+1 : 0;
  let antes=0, despues=0, ok=0;
  for(const file of arr){
    try{
      const r = await uploadOne(file, orden++);
      antes+=r.antes; despues+=r.despues; ok++;
    }catch(err){ console.error(err); toast("Error subiendo una foto"); }
  }
  await loadFotos(); await loadList();
  if(ok && antes>despues)
    toast(`${ok} foto(s) · ${peso(antes)} → ${peso(despues)} (${Math.round((1-despues/antes)*100)}% menos)`);
  else if(ok)
    toast(`${ok} foto(s) subida(s)`);
}
function removePending(id){
  const pf=pendingFiles.find(x=>x.id===id); if(pf) URL.revokeObjectURL(pf.url);
  pendingFiles=pendingFiles.filter(x=>x.id!==id); renderThumbs();
}
window.removePending=removePending;
async function deleteImg(id){
  const im=currentImgs.find(x=>x.id===id); if(!im) return;
  if(!confirm("¿Borrar esta foto?")) return;
  if(im.storage_path) await sb.storage.from("piezas").remove([im.storage_path]);
  await sb.from("imagenes").delete().eq("id",id);
  await loadFotos(); await loadList();
}
window.deleteImg=deleteImg;
async function moveImg(id,dir){
  const idx=currentImgs.findIndex(x=>x.id===id);
  const j=idx+dir; if(j<0||j>=currentImgs.length) return;
  const arr=currentImgs.slice();
  [arr[idx],arr[j]]=[arr[j],arr[idx]];
  currentImgs=arr; renderThumbs();
  await Promise.all(arr.map((im,i)=> im.orden!==i ? sb.from("imagenes").update({orden:i}).eq("id",im.id) : null));
  arr.forEach((im,i)=>im.orden=i);
  loadList();
}
window.moveImg=moveImg;

/* ═══════════════ MANTENIMIENTO · lista de animales ═══════════════ */
async function loadMantList(){
  const { data, error } = await sb.from("piezas")
    .select("id,nombre_comun,codigo,estado_pieza,orden_display, imagenes(url,orden), mantenimientos(estado,fecha_programada)")
    .order("orden_display",{ascending:true});
  if(error){ toast("Error cargando"); console.error(error); return; }
  MANT_PIEZAS = data||[];
  renderMantList();
}
function renderMantList(){
  const q=($("#mantSearch").value||"").toLowerCase();
  const list=MANT_PIEZAS.filter(p=>!q || (p.nombre_comun+" "+(p.codigo||"")).toLowerCase().includes(q));
  const rows=$("#mantRows");
  if(!list.length){ rows.innerHTML=`<div class="empty">${MANT_PIEZAS.length?"Sin resultados.":"Aún no hay piezas cargadas."}</div>`; return; }
  const hoy=today();
  rows.innerHTML=list.map(p=>{
    const img=(p.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0))[0];
    const prog=(p.mantenimientos||[]).filter(m=>m.estado!=="realizado"&&m.fecha_programada).map(m=>m.fecha_programada).sort();
    const next=prog[0];
    const due=next&&next<=hoy;
    const txt=next?`Próximo: ${fmtDate(next)}`:"Sin mantenimiento programado";
    return `<div class="row" onclick="openMantDetail('${p.id}')">
      <div class="thumb">${img?`<img src="${img.url}" alt="">`:"—"}</div>
      <div class="info">
        <div class="nm">${p.nombre_comun||"(sin nombre)"}</div>
        <div class="mant-next ${due?"due":""}">${due?"⚠ Vencido · ":""}${txt}</div>
      </div>
      <span class="pill ${estadoClass(p.estado_pieza||"Bueno")}">${p.estado_pieza||"Bueno"}</span>
      <button class="row-edit" title="Editar pieza" aria-label="Editar ${p.nombre_comun||""}"
        onclick="event.stopPropagation();editarPieza('${p.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14.5 5.5l4 4"/></svg>
      </button>
    </div>`;
  }).join("");
}
$("#mantSearch").addEventListener("input", renderMantList);
$("#mantBackBtn").addEventListener("click", ()=>{ showSection("mantListView"); enterMant(); });
$("#mantEditBtn").addEventListener("click", ()=>{ if(mSelId) editarPieza(mSelId); });

/* sub-tabs de Mantenimiento: Agenda / Por pieza */
$$("#mantTabs button").forEach(b=>b.addEventListener("click",()=>{
  $$("#mantTabs button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  const mt=b.dataset.mt;
  $("#mantAgenda").classList.toggle("hide", mt!=="agenda");
  $("#mantPiezasList").classList.toggle("hide", mt!=="piezas");
}));
function enterMant(){
  $$("#mantTabs button").forEach(x=>x.classList.toggle("on", x.dataset.mt==="agenda"));
  $("#mantAgenda").classList.remove("hide"); $("#mantPiezasList").classList.add("hide");
  loadAgenda(); loadMantList(); loadMantStats();
}

/* resumen por condición de las piezas */
async function loadMantStats(){
  const { data } = await sb.from("piezas").select("estado_pieza");
  const p=data||[];
  const ex=p.filter(x=>x.estado_pieza==="Excelente"||x.estado_pieza==="Bueno").length;
  const rev=p.filter(x=>x.estado_pieza==="Requiere atención").length;
  const urg=p.filter(x=>x.estado_pieza==="En restauración").length;
  const el=$("#mantStats"); if(!el) return;
  /* Los rótulos dicen exactamente el estado que cuentan: antes ponía
     "Revisar" y "Urgente", que no son valores del campo Estado y hacían
     pensar que el sistema decidía la urgencia por su cuenta. */
  el.innerHTML=`
    <div class="mstat ok"><div class="n">${ex}</div><div class="l">En buen estado</div></div>
    <div class="mstat warn"><div class="n">${rev}</div><div class="l">Requieren atención</div></div>
    <div class="mstat bad"><div class="n">${urg}</div><div class="l">En restauración</div></div>`;
}

/* ---------- poner al día las revisiones automáticas ----------
   Las revisiones que creó la importación son una foto fija de cómo estaba
   la ficha aquel día: siguen pidiendo cosas que ya se completaron. Esto
   vuelve a mirar la base y reescribe cada una con lo que falta ahora.
   Solo toca las que empiezan por "Falta poner:"; las escritas a mano no. */

/* Qué le falta a una pieza, mirando la base y no el inventario original */
function loQueFalta(p){
  const falta=[];
  const vacio = v => v===null || v===undefined || v==="";
  const caza=p.caza||{}, tax=p.taxidermia||{};

  if(!(p.imagenes||[]).length) falta.push("fotografías");
  if(vacio(p.historia))        falta.push("historia");
  if(vacio(p.region))          falta.push("región");
  if(vacio(caza.fecha))        falta.push("fecha");
  if(vacio(caza.operador))     falta.push("operador");
  if(vacio(caza.modalidad))    falta.push("modalidad");
  if(vacio(caza.distancia))    falta.push("distancia");
  if(vacio(caza.arma))         falta.push("arma");
  if(vacio(caza.calibre))      falta.push("calibre");
  if(vacio(tax.taller))        falta.push("taller de taxidermia");
  if(vacio(p.documentos))      falta.push("documentos");
  return falta;
}

async function ponerAlDiaRevisiones(){
  if(!confirm("Se van a revisar todas las piezas y reescribir las revisiones automáticas "+
              "con lo que falta ahora mismo. Las que escribiste a mano no se tocan. ¿Seguimos?")) return;

  const btn=$("#syncMantBtn");
  btn.disabled=true; const antes=btn.textContent; btn.textContent="Revisando…";

  const { data:piezas, error } = await sb.from("piezas")
    .select("id,nombre_comun,historia,region,documentos,caza,taxidermia, imagenes(id)");
  if(error){ toast("No se pudo leer: "+error.message); btn.disabled=false; btn.textContent=antes; return; }

  let alDia=0, nuevas=0, cerradas=0, borradas=0;

  for(const p of piezas||[]){
    const falta=loQueFalta(p), n=falta.length;
    const desc = n ? "Falta poner: "+falta.join(", ")+"." : null;
    const dias = n>=8 ? 15 : n>=4 ? 30 : 45;
    const f=new Date(); f.setDate(f.getDate()+dias);
    const tipo = n===1 && falta[0]==="fotografías" ? "Cargar fotografías" : "Completar ficha";

    const { data:autos } = await sb.from("mantenimientos")
      .select("id,descripcion")
      .eq("pieza_id",p.id).eq("estado","programado")
      .like("descripcion","Falta poner:%");

    if(autos && autos.length){
      if(!n){
        /* ya no falta nada: se cierra en vez de dejarla colgando */
        for(const a of autos){
          await sb.from("mantenimientos").update({
            estado:"realizado", fecha_realizado:today()
          }).eq("id",a.id);
          cerradas++;
        }
      }else{
        const { error:e } = await sb.from("mantenimientos").update({
          tipo, descripcion:desc, fecha_programada:f.toISOString().slice(0,10)
        }).eq("id",autos[0].id);
        if(!e && autos[0].descripcion!==desc) alDia++;
        for(const a of autos.slice(1)){
          await sb.from("mantenimientos").delete().eq("id",a.id);
          borradas++;
        }
      }
    }else if(n){
      const { error:e } = await sb.from("mantenimientos").insert({
        pieza_id:p.id, tipo, descripcion:desc,
        estado:"programado", fecha_programada:f.toISOString().slice(0,10)
      });
      if(!e) nuevas++;
    }
  }

  btn.disabled=false; btn.textContent=antes;
  await loadMantStats(); await loadAgenda();

  const partes=[];
  if(alDia)    partes.push(alDia+" al día");
  if(cerradas) partes.push(cerradas+" cerradas");
  if(nuevas)   partes.push(nuevas+" nuevas");
  if(borradas) partes.push(borradas+" duplicadas fuera");
  toast(partes.length ? "Revisiones: "+partes.join(", ") : "Ya estaba todo al día");
}

/* Agenda: todos los mantenimientos pendientes de todas las piezas */
async function loadAgenda(){
  const { data, error } = await sb.from("mantenimientos")
    .select("*, piezas(id,nombre_comun,codigo, imagenes(url,orden))")
    .neq("estado","realizado")
    .order("fecha_programada",{ascending:true,nullsFirst:false});
  if(error){ console.error(error); return; }
  renderAgenda(data||[]);
}
function renderAgenda(items){
  const c=$("#mantAgenda"), hoy=today();
  if(!items.length){ c.innerHTML=`<div class="empty">No hay tareas pendientes.<br><span style="font-size:12.5px;font-style:normal">Programalas desde “Por pieza”.</span></div>`; return; }
  c.innerHTML=items.map(m=>{
    const pz=m.piezas||{};
    const img=(pz.imagenes||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0))[0];
    const f=m.fecha_programada;
    const vencido=f&&f<hoy, esHoy=f===hoy;
    const color=vencido?"var(--rojo)":esHoy?"var(--ambar)":"var(--oro)";
    return `<div class="card">
      <div class="c-media">
        <div class="thumb">${img?`<img src="${img.url}" alt="">`:""}</div>
        <div style="flex:1;min-width:0">
          <div class="c-tipo" style="font-size:16px">${pz.nombre_comun||"—"}</div>
          <div class="c-date">${pz.codigo?pz.codigo+" · ":""}${m.tipo||"Mantenimiento"}</div>
        </div>
        <div style="text-align:right;flex:0 0 auto">
          <div style="font-size:12.5px;font-weight:600;color:${color}">${f?fmtDate(f):"Sin fecha"}</div>
          ${vencido?`<div style="font-size:10.5px;color:var(--rojo);font-weight:600;letter-spacing:.06em">VENCIDO</div>`:esHoy?`<div style="font-size:10.5px;color:var(--ambar);font-weight:600;letter-spacing:.06em">HOY</div>`:""}
        </div>
      </div>
      ${m.descripcion?`<div class="c-desc" style="margin-top:10px">${m.descripcion}</div>`:""}
      <div class="c-foot">
        ${m.responsable?`<span class="c-date">👤 ${m.responsable}</span>`:""}
        <button class="link" onclick="markDone('${m.id}')">Marcar realizado</button>
        <button class="link" onclick="editarPieza('${pz.id}')">Editar pieza ↗</button>
        <button class="link" onclick="openMantDetail('${pz.id}')">Ver conservación</button>
      </div>
    </div>`;
  }).join("");
}
async function refreshMant(){
  if(!$("#mantListView").classList.contains("hide")) await loadAgenda();
  if(mSelId && !$("#mantDetailView").classList.contains("hide")) await loadMant();
}

async function openMantDetail(id){
  mSelId=id;
  const p = MANT_PIEZAS.find(x=>x.id===id) || PIEZAS.find(x=>x.id===id);
  $("#mantTitle").textContent = p ? p.nombre_comun : "Pieza";
  $("#mantSub").textContent = p ? (p.codigo||p.id) : "";
  $("#notaTexto").value="";
  showSection("mantDetailView");
  await Promise.all([loadMant(), loadNotas()]);
}
window.openMantDetail=openMantDetail;

/* ═══════════════ MANTENIMIENTOS (de la pieza seleccionada) ═══════════════ */
async function loadMant(){
  const { data, error } = await sb.from("mantenimientos").select("*").eq("pieza_id",mSelId)
    .order("fecha_programada",{ascending:true,nullsFirst:false});
  if(error){ console.error(error); return; }
  const prog=(data||[]).filter(m=>m.estado!=="realizado");
  const hist=(data||[]).filter(m=>m.estado==="realizado")
    .sort((a,b)=>(b.fecha_realizado||"").localeCompare(a.fecha_realizado||""));
  $("#mantProg").innerHTML = prog.length ? prog.map(mantCard).join("") : `<div class="empty" style="padding:20px">Sin mantenimientos programados.</div>`;
  $("#mantHist").innerHTML = hist.length ? hist.map(mantCard).join("") : `<div class="empty" style="padding:20px">Sin historial todavía.</div>`;
}
function mantCard(m){
  const real=m.estado==="realizado";
  const fecha=real?m.fecha_realizado:m.fecha_programada;
  return `<div class="card">
    <div class="c-top">
      <span class="c-tipo">${m.tipo||"Mantenimiento"}</span>
      <span class="tag ${real?"real":"prog"}">${real?"Realizado":"Programado"}</span>
    </div>
    ${fecha?`<div class="c-date">${real?"Hecho el":"Previsto para"} ${fmtDate(fecha)}</div>`:""}
    ${m.descripcion?`<div class="c-desc" style="margin-top:6px">${m.descripcion}</div>`:""}
    <div class="c-foot">
      ${m.responsable?`<span class="c-date">👤 ${m.responsable}</span>`:""}
      ${!real?`<button class="link" onclick="markDone('${m.id}')">Marcar realizado</button>`:""}
      <button class="link" onclick="editMant('${m.id}')">Editar</button>
      <button class="link del" onclick="deleteMant('${m.id}')">Borrar</button>
    </div>
  </div>`;
}
const mantOverlay=$("#mantOverlay");
/* global=true ⇒ se está creando desde la pantalla de Conservación,
   así que hay que elegir a qué pieza pertenece. */
function openMantModal(m, global){
  mantEditId = m ? m.id : null;
  $("#mantModalTitle").textContent = m ? "Editar mantenimiento" : "Registrar mantenimiento";
  $("#m_tipo").value=m?.tipo||""; $("#m_responsable").value=m?.responsable||"";
  $("#m_desc").value=m?.descripcion||""; $("#m_estado").value=m?.estado||"programado";
  $("#m_fecha").value = m ? (m.estado==="realizado"?m.fecha_realizado:m.fecha_programada)||"" : "";

  const necesitaPieza = global || (!m && !mSelId);
  const campo=$("#mPiezaField"), sel=$("#m_pieza");
  campo.classList.toggle("hide", !necesitaPieza);
  if(necesitaPieza){
    const lista=(PIEZAS.length?PIEZAS:MANT_PIEZAS).slice()
      .sort((a,b)=>(a.nombre_comun||"").localeCompare(b.nombre_comun||""));
    sel.innerHTML=`<option value="">— elegir pieza —</option>`+
      lista.map(p=>`<option value="${p.id}">${p.nombre_comun||p.id}${p.codigo?" · "+p.codigo:""}</option>`).join("");
    sel.value = m?.pieza_id || mSelId || "";
  }
  syncFechaLabel();
  mantOverlay.classList.add("show");
}
$("#m_estado").addEventListener("change", syncFechaLabel);
function syncFechaLabel(){ $("#m_fechaLabel").textContent = $("#m_estado").value==="realizado" ? "Fecha realizado" : "Fecha prevista"; }
$("#addMantBtn").addEventListener("click", ()=>openMantModal(null));
$("#addMantGlobal").addEventListener("click", ()=>{
  if(!PIEZAS.length && !MANT_PIEZAS.length){ toast("Primero carga una pieza"); return; }
  openMantModal(null, true);
});
$("#syncMantBtn").addEventListener("click", ponerAlDiaRevisiones);
$("#mantCancel").addEventListener("click", ()=>mantOverlay.classList.remove("show"));
mantOverlay.addEventListener("click", e=>{ if(e.target===mantOverlay) mantOverlay.classList.remove("show"); });
$("#mantSave").addEventListener("click", async ()=>{
  const usaSelector = !$("#mPiezaField").classList.contains("hide");
  const piezaId = usaSelector ? $("#m_pieza").value : mSelId;
  if(!piezaId){ toast("Elige a qué pieza corresponde"); return; }
  const estado=$("#m_estado").value, fecha=$("#m_fecha").value||null;
  const body={ pieza_id:piezaId, tipo:$("#m_tipo").value.trim(), responsable:$("#m_responsable").value.trim(),
    descripcion:$("#m_desc").value.trim(), estado,
    fecha_programada: estado==="programado"?fecha:null, fecha_realizado: estado==="realizado"?fecha:null };
  const btn=$("#mantSave"); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  const q = mantEditId ? sb.from("mantenimientos").update(body).eq("id",mantEditId) : sb.from("mantenimientos").insert(body);
  const { error } = await q;
  btn.disabled=false; btn.textContent="Guardar";
  if(error){ toast("Error al guardar"); console.error(error); return; }
  mantOverlay.classList.remove("show"); toast("Mantenimiento guardado"); refreshMant();
});
async function markDone(id){
  const { error } = await sb.from("mantenimientos").update({estado:"realizado",fecha_realizado:today()}).eq("id",id);
  if(error){ toast("Error"); return; } toast("Marcado como realizado"); refreshMant();
}
window.markDone=markDone;
async function editMant(id){
  const { data } = await sb.from("mantenimientos").select("*").eq("id",id).single();
  if(data) openMantModal(data);
}
window.editMant=editMant;
async function deleteMant(id){
  if(!confirm("¿Borrar este mantenimiento?")) return;
  await sb.from("mantenimientos").delete().eq("id",id); refreshMant();
}
window.deleteMant=deleteMant;

/* ═══════════════ NOTAS (de la pieza seleccionada) ═══════════════ */
async function loadNotas(){
  const { data, error } = await sb.from("notas").select("*").eq("pieza_id",mSelId).order("created_at",{ascending:false});
  if(error){ console.error(error); return; }
  const list=$("#notasList");
  list.innerHTML=(data&&data.length)?data.map(n=>`
    <div class="card">
      <div class="c-desc" style="color:var(--texto)">${n.texto}</div>
      <div class="c-foot"><span class="c-date">${new Date(n.created_at).toLocaleDateString("es")}</span>
        <button class="link del" onclick="deleteNota('${n.id}')">Borrar</button></div>
    </div>`).join(""):`<div class="empty" style="padding:20px">Sin notas todavía.</div>`;
}
$("#addNotaBtn").addEventListener("click", async ()=>{
  const texto=$("#notaTexto").value.trim(); if(!texto) return;
  const { error } = await sb.from("notas").insert({pieza_id:mSelId,texto});
  if(error){ toast("Error"); return; }
  $("#notaTexto").value=""; loadNotas();
});
async function deleteNota(id){ if(!confirm("¿Borrar esta nota?"))return; await sb.from("notas").delete().eq("id",id); loadNotas(); }
window.deleteNota=deleteNota;

/* ═══════════════ QR ═══════════════ */
function piezaUrl(id){ const base=location.href.replace(/admin\.html.*$/,""); return base+"#/pieza/"+encodeURIComponent(id); }
function renderQR(){
  if(!currentId) return;
  const url=piezaUrl(currentId);
  $("#qrUrl").textContent=url; $("#qrOpen").href=url;
  if(window.QRCode){ QRCode.toCanvas($("#qrCanvas"), url, {width:220,margin:1,color:{dark:"#13170D",light:"#ffffff"}}, err=>{ if(err)console.error(err); }); }
}
$("#qrDownload").addEventListener("click", ()=>{
  const c=$("#qrCanvas"); const a=document.createElement("a");
  a.download=`QR-${currentId}.png`; a.href=c.toDataURL("image/png"); a.click();
});
