/* ═══════════════════════════════════════════════════════════════
   PABELLÓN 414 · Panel de administración
   Usa el cliente `sb` y helpers definidos en config.js
   ═══════════════════════════════════════════════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let PIEZAS = [];        // lista en memoria para la vista de lista
let currentId = null;   // id de la pieza en edición (null = nueva)
let currentImgs = [];   // imágenes de la pieza en edición
let mantEditId = null;  // id del mantenimiento en edición dentro del modal

/* ---------- utilidades ---------- */
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),2200);}
function slugify(s){return (s||"pieza").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"pieza";}
function rand(n){return Math.random().toString(36).slice(2,2+n);}
function estadoClass(e){return e==="Excelente"?"ex":e==="Requiere atención"?"at":e==="En restauración"?"re":"";}
function fmtDate(d){if(!d)return"";const p=d.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d;}

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
  await loadList();
  // deep-link desde el sitio público: admin.html#pieza=<id>
  const m = location.hash.match(/^#pieza=(.+)$/);
  if(m){ openEditor(decodeURIComponent(m[1])); history.replaceState(null,"","admin.html"); }
}

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

/* ═══════════════ EDITOR ═══════════════ */
function switchView(v){
  $("#listView").classList.toggle("hide", v!=="list");
  $("#editView").classList.toggle("hide", v!=="edit");
  window.scrollTo(0,0);
}
$("#backBtn").addEventListener("click", ()=>{ switchView("list"); loadList(); });
$("#cancelBtn").addEventListener("click", ()=>{ switchView("list"); loadList(); });

$$("#edTabs button").forEach(b=>b.addEventListener("click", ()=>{
  $$("#edTabs button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  $$(".pane").forEach(p=>p.classList.toggle("on", p.dataset.p===b.dataset.t));
}));
function goTab(t){ $$("#edTabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t)); $$(".pane").forEach(p=>p.classList.toggle("on",p.dataset.p===t)); }

const F = {
  scalar:["codigo","nombre_comun","nombre_cientifico","especie","continente","pais","region","sala","ubicacion_actual","estado_pieza","documentos","historia","pull"],
  bio:["clase","orden","familia","distribucion","habitat","estado"],
  caza:["fecha","operador","modalidad","distancia","arma","calibre"],
  tax:["fecha","taller","observaciones"]
};

async function openEditor(id){
  currentId=id; currentImgs=[];
  const p = id ? PIEZAS.find(x=>x.id===id) : null;
  // limpiar
  F.scalar.forEach(k=>{ const el=$("#f_"+k); if(el) el.value = p ? (p[k]??"") : ""; });
  if(!p) $("#f_estado_pieza").value="Bueno";
  $("#f_anio").value = p && p.anio!=null ? p.anio : "";
  F.bio.forEach(k=>$("#f_bio_"+k).value = p&&p.bio ? (p.bio[k]||"") : "");
  F.caza.forEach(k=>$("#f_caza_"+k).value = p&&p.caza ? (p.caza[k]||"") : "");
  F.tax.forEach(k=>$("#f_tax_"+k).value = p&&p.taxidermia ? (p.taxidermia[k]||"") : "");

  $("#edTitle").textContent = p ? p.nombre_comun : "Nueva pieza";
  $("#edSub").textContent = p ? (p.codigo||p.id) : "Completá los datos y guardá";
  $("#deleteBtn").classList.toggle("hide", !p);
  goTab("datos");

  const locked = !p;
  ["fotos","mant","notas","qr"].forEach(s=>{
    $("#"+s+"Locked").classList.toggle("hide", !locked);
    $("#"+s+"Area").classList.toggle("hide", locked);
  });
  switchView("edit");

  if(p){ await Promise.all([loadFotos(), loadMant(), loadNotas()]); renderQR(); }
}
window.openEditor = openEditor;

function readForm(){
  const anio = $("#f_anio").value.trim();
  const obj = {
    codigo:$("#f_codigo").value.trim(),
    nombre_comun:$("#f_nombre_comun").value.trim(),
    nombre_cientifico:$("#f_nombre_cientifico").value.trim(),
    especie:$("#f_especie").value.trim(),
    continente:$("#f_continente").value.trim(),
    pais:$("#f_pais").value.trim(),
    anio: anio===""?null:parseInt(anio,10),
    region:$("#f_region").value.trim(),
    sala:$("#f_sala").value.trim(),
    ubicacion_actual:$("#f_ubicacion_actual").value.trim(),
    estado_pieza:$("#f_estado_pieza").value,
    documentos:$("#f_documentos").value.trim(),
    historia:$("#f_historia").value.trim(),
    pull:$("#f_pull").value.trim(),
    bio:{}, caza:{}, taxidermia:{}
  };
  F.bio.forEach(k=>obj.bio[k]=$("#f_bio_"+k).value.trim());
  F.caza.forEach(k=>obj.caza[k]=$("#f_caza_"+k).value.trim());
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
      toast("Pieza creada");
      // desbloquear pestañas
      ["fotos","mant","notas","qr"].forEach(s=>{ $("#"+s+"Locked").classList.add("hide"); $("#"+s+"Area").classList.remove("hide"); });
      $("#deleteBtn").classList.remove("hide");
      $("#edSub").textContent = body.codigo||currentId;
      renderQR();
    }
    await loadList();
    $("#edTitle").textContent = body.nombre_comun;
  }catch(err){ console.error(err); toast("Error al guardar"); }
  btn.disabled=false; btn.textContent="Guardar";
});

$("#deleteBtn").addEventListener("click", async ()=>{
  if(!currentId) return;
  if(!confirm("¿Eliminar esta pieza y todas sus fotos, mantenimientos y notas? No se puede deshacer.")) return;
  // borrar fotos del storage
  const paths = currentImgs.map(i=>i.storage_path).filter(Boolean);
  if(paths.length) await sb.storage.from("piezas").remove(paths);
  const { error } = await sb.from("piezas").delete().eq("id",currentId);
  if(error){ toast("Error al eliminar"); return; }
  toast("Pieza eliminada"); switchView("list"); loadList();
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
}
$("#fileInput").addEventListener("change", e=>uploadFiles(e.target.files));
const drop=$("#drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
drop.addEventListener("drop", e=>uploadFiles(e.dataTransfer.files));

async function uploadFiles(files){
  if(!currentId){ toast("Guardá la pieza primero"); return; }
  const arr=[...files].filter(f=>f.type.startsWith("image/"));
  if(!arr.length) return;
  toast(`Subiendo ${arr.length} foto(s)…`);
  let orden = currentImgs.length ? Math.max(...currentImgs.map(i=>i.orden||0))+1 : 0;
  for(const file of arr){
    try{
      const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
      const path=`${currentId}/${Date.now()}-${rand(4)}.${ext}`;
      const up=await sb.storage.from("piezas").upload(path,file,{cacheControl:"3600",upsert:false});
      if(up.error) throw up.error;
      const url=sb.storage.from("piezas").getPublicUrl(path).data.publicUrl;
      const ins=await sb.from("imagenes").insert({pieza_id:currentId,storage_path:path,url,orden:orden++});
      if(ins.error) throw ins.error;
    }catch(err){ console.error(err); toast("Error subiendo una foto"); }
  }
  await loadFotos(); await loadList();
  toast("Fotos actualizadas");
}
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

/* ═══════════════ MANTENIMIENTOS ═══════════════ */
async function loadMant(){
  const { data, error } = await sb.from("mantenimientos").select("*").eq("pieza_id",currentId)
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
function openMantModal(m){
  mantEditId = m ? m.id : null;
  $("#mantModalTitle").textContent = m ? "Editar mantenimiento" : "Programar mantenimiento";
  $("#m_tipo").value=m?.tipo||""; $("#m_responsable").value=m?.responsable||"";
  $("#m_desc").value=m?.descripcion||""; $("#m_estado").value=m?.estado||"programado";
  $("#m_fecha").value = m ? (m.estado==="realizado"?m.fecha_realizado:m.fecha_programada)||"" : "";
  syncFechaLabel();
  mantOverlay.classList.add("show");
}
$("#m_estado").addEventListener("change", syncFechaLabel);
function syncFechaLabel(){ $("#m_fechaLabel").textContent = $("#m_estado").value==="realizado" ? "Fecha realizado" : "Fecha prevista"; }
$("#addMantBtn").addEventListener("click", ()=>openMantModal(null));
$("#mantCancel").addEventListener("click", ()=>mantOverlay.classList.remove("show"));
mantOverlay.addEventListener("click", e=>{ if(e.target===mantOverlay) mantOverlay.classList.remove("show"); });
$("#mantSave").addEventListener("click", async ()=>{
  const estado=$("#m_estado").value, fecha=$("#m_fecha").value||null;
  const body={ pieza_id:currentId, tipo:$("#m_tipo").value.trim(), responsable:$("#m_responsable").value.trim(),
    descripcion:$("#m_desc").value.trim(), estado,
    fecha_programada: estado==="programado"?fecha:null, fecha_realizado: estado==="realizado"?fecha:null };
  const q = mantEditId ? sb.from("mantenimientos").update(body).eq("id",mantEditId) : sb.from("mantenimientos").insert(body);
  const { error } = await q;
  if(error){ toast("Error al guardar"); console.error(error); return; }
  mantOverlay.classList.remove("show"); toast("Mantenimiento guardado"); loadMant();
});
async function markDone(id){
  const { error } = await sb.from("mantenimientos").update({estado:"realizado",fecha_realizado:new Date().toISOString().slice(0,10)}).eq("id",id);
  if(error){ toast("Error"); return; } toast("Marcado como realizado"); loadMant();
}
window.markDone=markDone;
async function editMant(id){
  const { data } = await sb.from("mantenimientos").select("*").eq("id",id).single();
  if(data) openMantModal(data);
}
window.editMant=editMant;
async function deleteMant(id){
  if(!confirm("¿Borrar este mantenimiento?")) return;
  await sb.from("mantenimientos").delete().eq("id",id); loadMant();
}
window.deleteMant=deleteMant;

/* ═══════════════ NOTAS ═══════════════ */
async function loadNotas(){
  const { data, error } = await sb.from("notas").select("*").eq("pieza_id",currentId).order("created_at",{ascending:false});
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
  const texto=$("#notaTexto").value.trim(); if(!texto){ return; }
  const { error } = await sb.from("notas").insert({pieza_id:currentId,texto});
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
