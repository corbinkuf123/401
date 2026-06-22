/* =========================================================================
   PABELLÓN 414 · DATOS DE LOS ANIMALES
   =========================================================================

   CÓMO FUNCIONA (lee esto una vez):

   1. El "id" manda todo. Es un identificador corto, en minúsculas y con
      guiones, único para cada animal. Ese mismo id es:
        · el final de la URL / QR ......  .../#/pieza/ciervo-rojo
        · el nombre de la carpeta de fotos  img/ciervo-rojo/
      Elígelo bien y NO lo cambies después de imprimir el QR.

   2. Las fotos van por convención, no se escribe la ruta de cada una.
      Pon las fotos numeradas dentro de la carpeta con el nombre del id:
        img/ciervo-rojo/1.jpg
        img/ciervo-rojo/2.jpg
        img/ciervo-rojo/3.jpg
      y solo declara cuántas hay con  fotos: 3
      La portada siempre es la 1.jpg.
      (Si un animal todavía no tiene fotos, pon fotos: 0 y se muestra
       un recuadro de respaldo.)

   3. El ORDEN de esta lista no importa. Puedes reordenar o agregar
      animales cuando quieras: nada se rompe, porque todo se busca por id.

   4. "codigo" es solo la etiqueta visible estilo museo (CER-007). Es
      opcional; si la dejas en "" simplemente no se muestra.

   Para agregar un animal: copia el bloque PLANTILLA del final, pégalo
   dentro de la lista y rellena los campos.
   ========================================================================= */

const ANIMALES = [

  {
    id: "ciervo-rojo",                         // ← URL, carpeta de fotos y QR
    codigo: "CER-007",                         // etiqueta visible (opcional)
    nombreComun: "Ciervo rojo",
    nombreCientifico: "Cervus elaphus",
    especie: "Cérvido",
    continente: "América",
    pais: "Argentina",
    anio: 2019,
    region: "Aluminé, Neuquén",
    sala: "Sala América",
    vitrina: "Vitrina 3",
    fotos: 4,                                  // img/ciervo-rojo/1.jpg … 4.jpg

    bio: {
      clase: "Mammalia",
      orden: "Artiodactyla",
      familia: "Cervidae",
      distribucion: "Europa y Asia; introducido en la Patagonia",
      habitat: "Bosques templados y montaña",
      estado: "Preocupación menor"
    },

    caza: {
      fecha: "Septiembre 2019",
      modalidad: "Rececho",
      distancia: "180 m",
      arma: ".300 Win. Mag.",
      calibre: "180 gr"
    },

    pull: "«El bramido llegó antes que la luz.»",
    historia: [
      "Septiembre en la cordillera, con la nieve aún resistiendo en las laderas altas. Fueron tres días de rececho entre lengas y vientos cruzados antes de que el bramido resonara al amanecer en el valle del Aluminé.",
      "El animal apareció contra la primera luz, en lo alto de una pendiente de piedra. Más que la pieza, lo que queda es el silencio de esa mañana y el largo regreso a caballo con la nieve cayendo temprano."
    ],

    taxidermia: {
      fecha: "Marzo 2020",
      taller: "Taller de Taxidermia Andina, Bariloche",
      observaciones: "Cabeza completa con cornamenta de doce puntas."
    },

    documentos: ["Certificado de procedencia", "Permiso de caza mayor", "Informe de la expedición"]
  },

  {
    id: "kudu-mayor",
    codigo: "KUD-021",
    nombreComun: "Kudú mayor",
    nombreCientifico: "Tragelaphus strepsiceros",
    especie: "Antílope",
    continente: "África",
    pais: "Namibia",
    anio: 2021,
    region: "Región de Kunene",
    sala: "Sala África",
    vitrina: "Vitrina 5",
    fotos: 5,

    bio: {
      clase: "Mammalia",
      orden: "Artiodactyla",
      familia: "Bovidae",
      distribucion: "África oriental y austral",
      habitat: "Sabana arbolada y matorral denso",
      estado: "Preocupación menor"
    },

    caza: {
      fecha: "Junio 2021",
      modalidad: "Rececho y espera",
      distancia: "210 m",
      arma: "7 mm Rem. Mag.",
      calibre: "150 gr"
    },

    pull: "«Cinco días de huellas sobre la arena roja.»",
    historia: [
      "El kudú es el fantasma gris del monte africano: se desvanece entre la espesura justo cuando crees haberlo encontrado. Fueron cinco jornadas siguiendo huellas sobre la arena roja del Kunene, guiados por un rastreador himba que leía el suelo como un libro abierto.",
      "Lo avistamos al atardecer, inmóvil bajo una acacia, con los cuernos en espiral recortados contra el cielo. Namibia se quedó grabada en el polvo de las botas."
    ],

    taxidermia: {
      fecha: "Octubre 2021",
      taller: "African Trophies Studio, Windhoek",
      observaciones: "Montaje de hombro. Cuernos de 132 cm medidos en espiral."
    },

    documentos: ["Certificado CITES", "Permiso de exportación", "Informe de la expedición", "Ficha técnica de montaje"]
  },

  {
    id: "leon",
    codigo: "LEO-001",
    nombreComun: "León",
    nombreCientifico: "Panthera leo",
    especie: "Felino",
    continente: "África",
    pais: "Zambia",
    anio: 2019,
    region: "Valle del Luangwa",
    sala: "Sala Especial",
    vitrina: "Pedestal central",
    fotos: 8,

    bio: {
      clase: "Mammalia",
      orden: "Carnivora",
      familia: "Felidae",
      distribucion: "África subsahariana",
      habitat: "Sabana y praderas abiertas",
      estado: "Vulnerable"
    },

    caza: {
      fecha: "Septiembre 2019",
      modalidad: "Rececho a pie",
      distancia: "80 m",
      arma: ".375 H&H",
      calibre: "300 gr"
    },

    pull: "«Un rugido en la oscuridad total del valle.»",
    historia: [
      "Pocas experiencias igualan la primera noche en que se escucha rugir a un león cerca del campamento, en la oscuridad total del valle del Luangwa. El seguimiento se hizo a pie, con un rastreador local que interpretaba cada huella y cada alarma de los pájaros.",
      "El encuentro, breve y a plena luz, dejó claro por qué este animal ocupa el centro de tantas historias. Más que un trofeo, el recuerdo de un respeto."
    ],

    taxidermia: {
      fecha: "Marzo 2020",
      taller: "Luangwa Taxidermy, Lusaka",
      observaciones: "Montaje de cuerpo completo sobre pedestal."
    },

    documentos: ["Certificado CITES", "Permiso de exportación", "Informe de la expedición"]
  },

  /* ======================= PLANTILLA EN BLANCO =======================
     Copia este bloque completo (incluida la coma final), pégalo arriba
     dentro de la lista y rellena. Borra el // de adelante para activarlo.

  {
    id: "",                       // p.ej. "bufalo-cafre"  (minúsculas, guiones)
    codigo: "",                   // p.ej. "BUF-014"  (opcional)
    nombreComun: "",
    nombreCientifico: "",
    especie: "",                  // p.ej. Cérvido / Antílope / Felino…
    continente: "",               // África / América / Europa / Asia…
    pais: "",
    anio: 2020,
    region: "",
    sala: "",                     // p.ej. "Sala África"
    vitrina: "",                  // p.ej. "Vitrina 2"
    fotos: 0,                     // nº de fotos en img/<id>/  (0 si aún no hay)

    bio: {
      clase: "",
      orden: "",
      familia: "",
      distribucion: "",
      habitat: "",
      estado: ""                  // estado de conservación de la especie
    },

    caza: {
      fecha: "",
      modalidad: "",
      distancia: "",
      arma: "",
      calibre: ""
    },

    pull: "«»",                   // frase corta destacada de la historia
    historia: [
      "Primer párrafo de la expedición…",
      "Segundo párrafo…"
    ],

    taxidermia: {
      fecha: "",
      taller: "",
      observaciones: ""
    },

    documentos: ["Certificado", "Permiso de exportación"]
  },

  =================================================================== */

];
