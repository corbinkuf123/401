/* Reparto de las fotografías del pabellón entre las piezas.
   Cada clave es el id de la pieza; el orden del array es el orden
   en que se mostrarán, así que la primera es la foto principal.
   Los nombres son los de la carpeta ya reducida (fotos-web). */

const FOTOS = {

  /* ── Rusia ─────────────────────────────────────────────── */
  "alce":              ["P1000231.jpg", "P1000264.jpg"],
  "palma-de-oso":      ["P1000257.jpg"],
  "snow-sheep":        ["P1000305.jpg"],
  "urogallo":          ["WhatsApp Image 2018-10-08 at 12.32.39 PM.jpg"],

  /* ── Nueva Zelanda ─────────────────────────────────────── */
  "rebeco":            ["Chamois pablo.jpg", "Rebecos.jpg"],
  "tahr":              ["Tahr NZ.jpg"],
  "elk":               ["P1010697.jpg", "P1010705.jpg", "P1010688.jpg", "P1010696.jpg"],
  "ciervo-3":          ["Ciervo Pablo NZ.jpg", "_DSC5512.jpg", "_DSC5393.jpg"],

  /* ── Tayikistán ────────────────────────────────────────── */
  "marco-polo":        ["P1010083.jpg", "P1010126.jpg", "P1010101.jpg", "P1010139.jpg",
                        "P1010060.jpg", "P1010070.jpg", "P1010073.jpg"],
  "marco-polo-craneo": ["P1010051.jpg"],
  "markhor":           ["MARKHOR 1.jpg", "MARKHOR 3.jpg"],

  /* ── Turquía / Oriente Próximo ─────────────────────────── */
  "ibex-bezoar":       ["bezoar.jpg", "bezoar 1.jpg", "bezoar 2.jpg"],
  "jabali":            ["asia8.jpg", "P1010416.jpg"],
  "gacela-anatolia":   ["P1010376.jpg", "P1010382.jpg"],

  /* ── España ────────────────────────────────────────────── */
  "ibex-beceite":      ["cgv 9.jpg", "cgv 8.jpg", "cgv 7.jpg"],
  "macho-montes":      ["pablo esp2.jpg", "pablo esp1.jpg", "pablo esp5.jpg", "pablo esp3.jpg"],

  /* ── Perú ──────────────────────────────────────────────── */
  "venado":            ["Cusco 9pts.jpg", "Cusco 8pts.jpg", "Cusco 9pts 2.jpg",
                        "CUSCO 2.jpg", "CUSCO 3.jpg", "CUSCO 1.jpg",
                        "CUSCO 4.jpg", "Cusco .jpg", "CUSCO 6.jpg"],

  /* ── Norteamérica ──────────────────────────────────────── */
  "mule-deer":         ["SONORA 3.jpg", "SONORA 4.jpg", "SONORA 1.jpg"],
  "whitetail":         ["MEXICO 8.jpg", "Venado USA 2.jpg", "MEXICO 9.jpg"],
  "borrego-cimarron":  ["MEXICO 7.jpg", "MEXICO 3.jpg", "MEXICO 1.jpg"],
  "caiman-entrada":    ["caiman usa 1.jpg"],

  /* ── Sudamérica ────────────────────────────────────────── */
  "bufalos-brasil":    ["P1000686.jpg", "P1000716.jpg", "P1000711.jpg"],

  /* ── África ────────────────────────────────────────────── */
  "leon":              ["RZA 3.jpg", "RZA 2.jpg", "RZA 1.jpg"],
  "replica-rhino":     ["Rhino.jpg"],
  "bongo":             ["P1010703.jpg", "P1010662.jpg", "P1010648.jpg"]
};

/* Fotos que no se reparten porque no corresponden a ninguna pieza
   de la web. Se muestran en la herramienta para que se decida qué
   hacer con ellas, pero no se suben. */
const SOBRAN = [
  { f:"asia2.jpg",      especie:"Carnero anatolio · Turquía",
    por:"Del mismo viaje que el Ibex Bezoar y el Jabalí, pero su cabeza no figura en el inventario" },
  { f:"P1010722.jpg",   especie:"Carnero de Arapawa · Nueva Zelanda",
    por:"Su pieza en el inventario es «Escudo Carnero», marcada en rojo (no va en la web)" },
  { f:"P1010733.jpg",   especie:"Carnero de Arapawa · Nueva Zelanda",
    por:"Su pieza en el inventario es «Escudo Carnero», marcada en rojo (no va en la web)" },
  { f:"P1010652.jpg",   especie:"Duiker de bosque · Camerún",
    por:"Del viaje del Bongo, pero es otra especie y no hay pieza suya" },
  { f:"P1010671.jpg",   especie:"Duiker de bosque · Camerún",
    por:"Del viaje del Bongo, pero es otra especie y no hay pieza suya" },
  { f:"P1010690.jpg",   especie:"Potamóquero (jabalí de río) · Camerún",
    por:"Del viaje del Bongo, pero es otra especie y no hay pieza suya" },
  { f:"P1010696-2.jpg", especie:"Sitatunga · Camerún",
    por:"Del viaje del Bongo, pero es otra especie y no hay pieza suya" }
];
