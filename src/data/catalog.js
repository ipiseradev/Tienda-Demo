const mulberry32 = (seed) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const IMAGE_QUERIES = {
  Ropa: ["streetwear", "hoodie", "t-shirt", "jacket", "jeans", "sweater"],
  Calzado: ["sneakers", "shoes", "boots", "running shoes"],
  Accesorios: ["cap", "backpack", "belt", "wallet", "bag"],
  Hogar: ["home decor", "lamp", "blanket", "candle", "minimal home"],
  Tecnología: ["headphones", "keyboard", "speaker", "charger", "mouse"],
};

const productImage = (category, id) => {
  const queries = IMAGE_QUERIES[category] ?? ["product"];
  const q = queries[id % queries.length];
  const encoded = encodeURIComponent(q);
  return `https://source.unsplash.com/random/900x900?${encoded}&sig=${id}`;
};

export const CATEGORIES = [
  "Ropa",
  "Calzado",
  "Accesorios",
  "Hogar",
  "Tecnología",
];

export function generateCatalog(total = 900) {
  const rand = mulberry32(20260318);
  const adjectives = [
    "Básico",
    "Premium",
    "Urbano",
    "Clásico",
    "Minimal",
    "Cómodo",
    "Compacto",
    "Resistente",
    "Versátil",
  ];
  const itemsByCategory = {
    Ropa: ["Remera", "Buzo", "Campera", "Pantalón", "Short", "Camisa"],
    Calzado: ["Zapatillas", "Borcegos", "Ojotas", "Botas", "Sandalias"],
    Accesorios: ["Gorra", "Riñonera", "Cinturón", "Mochila", "Billetera"],
    Hogar: ["Lámpara", "Vela", "Manta", "Organizador", "Almohadón"],
    Tecnología: ["Auriculares", "Cargador", "Mouse", "Teclado", "Parlante"],
  };

  const products = [];
  for (let i = 1; i <= total; i += 1) {
    const category = pick(rand, CATEGORIES);
    const item = pick(rand, itemsByCategory[category]);
    const adj = pick(rand, adjectives);
    const variant = Math.floor(rand() * 9) + 1;
    const sku = `${slugify(category).slice(0, 3).toUpperCase()}-${String(i).padStart(4, "0")}`;
    const priceBase = {
      Ropa: 18000,
      Calzado: 52000,
      Accesorios: 12000,
      Hogar: 15000,
      Tecnología: 28000,
    }[category];
    const price = Math.round((priceBase + rand() * priceBase * 0.85) / 100) * 100;
    const stock = Math.max(0, Math.floor(rand() * 35) - (rand() > 0.92 ? 12 : 0));

    products.push({
      id: i,
      name: `${item} ${adj} ${variant}`,
      sku,
      category,
      price,
      stock,
      image: productImage(category, i),
    });
  }

  return products;
}
