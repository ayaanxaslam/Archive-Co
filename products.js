/* ============================================================
   ARCHIVE & CO — inventory
   ------------------------------------------------------------
   SAMPLE DATA. Replace with your real stock.

   Each piece:
     id        unique string
     brand     house / maker
     name      piece name
     cat       tops | outerwear | trousers | sneakers | accessories
     size      as labelled
     cond      condition grade
     era       season / year (optional)
     price     current asking price (number, GBP)
     was       original retail or previous ask (number, optional)
     status    "available" | "reserved" | "sold"
     grail     true -> gold "ARCHIVE GRAIL" tag
     img       path to photo e.g. "assets/img/piece-01.jpg" (optional)
               leave out and a placeholder tile is drawn instead
   ============================================================ */

const PRODUCTS = [
  /* ---------- TOPS ---------- */
  { id:"t01", brand:"Raf Simons",      name:"Oversized Graphic Tee",           cat:"tops",        size:"L",     cond:"Excellent",  era:"AW19", price:280, was:420, status:"available", grail:true },
  { id:"t02", brand:"Rick Owens",      name:"Level Longsleeve — Dust",         cat:"tops",        size:"M",     cond:"Very Good",  era:"SS21", price:190, was:310, status:"available" },
  { id:"t03", brand:"Stone Island",    name:"Compass Patch Crewneck",          cat:"tops",        size:"XL",    cond:"Excellent",  era:"AW20", price:165, was:245, status:"available" },
  { id:"t04", brand:"Maison Margiela", name:"Numbers Logo Tee",                cat:"tops",        size:"S",     cond:"Good",       era:"SS18", price:145, was:290, status:"sold" },
  { id:"t05", brand:"Undercover",      name:"Printed Cotton Tee",              cat:"tops",        size:"M",     cond:"Very Good",  era:"AW17", price:210, was:340, status:"available" },
  { id:"t06", brand:"Prada",           name:"Fine Gauge Knit Polo",            cat:"tops",        size:"L",     cond:"Excellent",  era:"SS22", price:340, was:590, status:"reserved" },

  /* ---------- OUTERWEAR ---------- */
  { id:"o01", brand:"Helmut Lang",     name:"Archive Bondage Bomber",          cat:"outerwear",   size:"M",     cond:"Very Good",  era:"1999", price:1250, was:1900, status:"available", grail:true },
  { id:"o02", brand:"Stone Island",    name:"Shadow Project Softshell",        cat:"outerwear",   size:"L",     cond:"Excellent",  era:"AW21", price:620, was:980,  status:"available" },
  { id:"o03", brand:"Acne Studios",    name:"Wool Overcoat — Charcoal",        cat:"outerwear",   size:"48",    cond:"Excellent",  era:"AW20", price:480, was:850,  status:"available" },
  { id:"o04", brand:"Yohji Yamamoto",  name:"Draped Gabardine Coat",           cat:"outerwear",   size:"3",     cond:"Very Good",  era:"AW16", price:890, was:1600, status:"available", grail:true },
  { id:"o05", brand:"Carhartt WIP",    name:"Detroit Jacket — Aged",           cat:"outerwear",   size:"M",     cond:"Good",       era:"2019", price:135, was:210,  status:"sold" },

  /* ---------- TROUSERS ---------- */
  { id:"p01", brand:"Rick Owens",      name:"Drkshdw Cargo Trouser",           cat:"trousers",    size:"31",    cond:"Very Good",  era:"SS20", price:395, was:640, status:"available" },
  { id:"p02", brand:"Comme des Garçons", name:"Wide Wool Trouser",             cat:"trousers",    size:"M",     cond:"Excellent",  era:"AW19", price:310, was:520, status:"available" },
  { id:"p03", brand:"Our Legacy",      name:"Formal Cut Trouser",              cat:"trousers",    size:"46",    cond:"Excellent",  era:"SS22", price:180, was:290, status:"available" },
  { id:"p04", brand:"Balenciaga",      name:"Baggy Denim — Washed Black",      cat:"trousers",    size:"32",    cond:"Very Good",  era:"AW21", price:560, was:890, status:"reserved" },
  { id:"p05", brand:"Stüssy",          name:"Beach Pant — Sand",               cat:"trousers",    size:"L",     cond:"Good",       era:"2021", price:95,  was:150, status:"available" },

  /* ---------- SNEAKERS ---------- */
  { id:"s01", brand:"Nike",            name:"Air Max 1 — Patta Waves",         cat:"sneakers",    size:"UK 9",  cond:"VNDS",       era:"2021", price:340, was:520, status:"available", grail:true },
  { id:"s02", brand:"Maison Margiela", name:"Replica GAT — Off White",         cat:"sneakers",    size:"UK 8",  cond:"Very Good",  era:"2020", price:290, was:450, status:"available" },
  { id:"s03", brand:"Nike",            name:"Dunk Low — Panda",                cat:"sneakers",    size:"UK 10", cond:"Good",       era:"2022", price:110, was:180, status:"sold" },
  { id:"s04", brand:"New Balance",     name:"990v3 — Grey",                    cat:"sneakers",    size:"UK 9.5",cond:"VNDS",       era:"2022", price:230, was:310, status:"available" },
  { id:"s05", brand:"Rick Owens",      name:"Geobasket — Black/White",         cat:"sneakers",    size:"UK 9",  cond:"Very Good",  era:"SS19", price:640, was:1050,status:"available", grail:true },
  { id:"s06", brand:"adidas",          name:"Samba OG — Aged Leather",         cat:"sneakers",    size:"UK 8.5",cond:"Good",       era:"2023", price:85,  was:120, status:"available" },

  /* ---------- ACCESSORIES ---------- */
  { id:"a01", brand:"Prada",           name:"Re-Nylon Waist Bag",              cat:"accessories", size:"OS",    cond:"Excellent",  era:"2021", price:480, was:790, status:"available" },
  { id:"a02", brand:"Maison Margiela", name:"Silver Ring — Four Stitch",       cat:"accessories", size:"M",     cond:"Excellent",  era:"—",    price:190, was:320, status:"available" },
  { id:"a03", brand:"Gucci",           name:"Leather Belt — GG Buckle",        cat:"accessories", size:"90",    cond:"Very Good",  era:"2019", price:260, was:430, status:"available" },
  { id:"a04", brand:"Supreme",         name:"Box Logo Beanie",                 cat:"accessories", size:"OS",    cond:"Good",       era:"AW20", price:75,  was:110, status:"sold" },
  { id:"a05", brand:"Bottega Veneta",  name:"Intrecciato Card Holder",         cat:"accessories", size:"OS",    cond:"Excellent",  era:"2022", price:290, was:450, status:"available" },
  { id:"a06", brand:"Oakley",          name:"Eyejacket Redux — Chrome",        cat:"accessories", size:"OS",    cond:"Very Good",  era:"2020", price:210, was:290, status:"available" }
];

const CATEGORY_META = {
  all:         { label:"All Pieces",   blurb:"Everything currently in the archive." },
  tops:        { label:"T-Shirts & Tops", blurb:"Tees, longsleeves, knitwear and crews." },
  outerwear:   { label:"Outerwear",    blurb:"Jackets, coats, shells and bombers." },
  trousers:    { label:"Trousers",     blurb:"Denim, tailoring, cargos and wide cuts." },
  sneakers:    { label:"Sneakers",     blurb:"Pre-owned and deadstock footwear." },
  accessories: { label:"Accessories",  blurb:"Bags, jewellery, belts, eyewear, caps." }
};
