export type Category =
  | "Featured"
  | "Grill & Bites"
  | "Juices & Mocktails"
  | "Milkshakes & Ice Cream"
  | "Barista Corner";

export type Variant = {
  id: string;
  label: string;
  price: number;
  packagingRequired: boolean;
  packagingFee: number;
  packagingQuantity: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: Category;
  image: string;
  available: boolean;
  featured?: boolean;
  supplier: string;
  variants: Variant[];
  spiceOptions?: string[];
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  minimum: number;
  available: boolean;
  eta: string;
  restriction?: string;
  freeAbove?: number;
};

// 1. HIGH-QUALITY ONLINE IMAGE HELPER
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const v = (
  id: string,
  label: string,
  price: number
): Variant => ({
  id,
  label,
  price,
  packagingRequired: false, 
  packagingFee: 0,
  packagingQuantity: 0,
});

export const products: Product[] = [
  // ==========================================
  // GRILL & BITES (Marked up for profit)
  // ==========================================
  {
    id: "shaw",
    name: "Chicken Shawarma",
    description: "Served with fries and dipping sauce.",
    category: "Grill & Bites",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwL5ciVNKIRE1KSlO_5NYgzRQC3xGYfXujeGlUvURUew&s=10",
    available: true,
    featured: true,
    supplier: "Dallas Grill Kitchen",
    variants: [v("regular", "Regular", 450)], // Base: 300
    spiceOptions: ["Mild", "Medium", "Hot", "Extra Hot"],
  },
  {
    id: "burger",
    name: "Classic Beef Burger",
    description: "Served with fries and dipping sauce.",
    category: "Grill & Bites",
    image: photo("photo-1568901346375-23c9450c58cd"),
    available: true,
    supplier: "Dallas Grill Kitchen",
    variants: [v("regular", "Regular", 450)], // Base: 350
  },
  {
    id: "mishi",
    name: "Mishikaki",
    description: "Grilled meat skewers.",
    category: "Grill & Bites",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi5sLd_rhHp-HNMroeY5NaqSOPxzfFgFcoEdPM7a9Fgg&s=10",
    available: false,
    featured: true,
    supplier: "Dallas Grill Kitchen",
    variants: [v("regular", "Regular", 150)], // Base: 100
    spiceOptions: ["Mild", "Medium", "Hot"],
  },
  {
    id: "sausage",
    name: "Choma Sausage",
    description: "Grilled sausage.",
    category: "Grill & Bites",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQF7MEqcpfnb75-0J3OPYhzlMPox6ZzIYoiVdP60QLzqA&s=10",
    available: true,
    supplier: "Dallas Grill Kitchen",
    variants: [v("regular", "Regular", 230)], // Base: 150
  },
  {
    id: "hotdog",
    name: "Hotdog",
    description: "Classic hotdog.",
    category: "Grill & Bites",
    image: "https://images.bolt.eu/store/2024/2024-04-01/cd0b00fb-4634-455f-8291-56dbe55c6c45.jpeg",
    available: true,
    supplier: "Dallas Grill Kitchen",
    variants: [v("regular", "Regular", 270)], // Base: 200
  },

  // ==========================================
  // JUICES & MOCKTAILS (Base: 250 -> Sell: 350)
  // ==========================================
  {
    id: "juice-fresh",
    name: "Fresh Juice",
    description: "Choose from Mango, Passion, Pineapple, or Melon.",
    category: "Juices & Mocktails",
    image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNI1V9jM7_cTPUAMMWPRcHKztDna59xynX4QI5J5rsrA&s=10", 
    available: true,
    featured: true,
    supplier: "Dallas Grill Bar",
    variants: [v("regular", "Regular", 350)], 
  },
  {
    id: "smoothie",
    name: "Fresh Fruit Smoothie",
    description: "Banana, Melon, or Mixed Fruit.",
    category: "Juices & Mocktails",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS87u4-R5M6NzsSWcLctTraSOjJavg9elnO7Fhn6OuI1QEDDMaEgCUQs3wk&s=10",
    available: true,
    supplier: "Dallas Grill Bar",
    variants: [v("regular", "Regular", 280)], // Base: 200
  },
  {
    id: "salad",
    name: "Special Fruit Salad",
    description: "Fresh seasonal fruits.",
    category: "Juices & Mocktails",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkB_YJG3z6XV_d6ZDKE7wX7RedXFreHczgoMZmP_1Lew&s=10",
    available: true,
    supplier: "Dallas Grill",
    variants: [v("regular", "Regular", 200)], // Base: 150
  },
  {
    id: "mojito",
    name: "Virgin Mojito",
    description: "Refreshing mint and lime mocktail.",
    category: "Juices & Mocktails",
    image: photo("photo-1513558161293-cdaf765ed2fd"),
    available: true,
    supplier: "Dallas Grill",
    variants: [v("regular", "Regular", 350)], // Base: 250
  },

  // ==========================================
  // MILKSHAKES & ICE CREAM
  // ==========================================
  {
    id: "milkshake",
    name: "Milkshake",
    description: "Choose one flavour or mix: Vanilla, Strawberry, Mango, Blueberry, Pistachio, Chocolate, Salted Caramel, Oreo.",
    category: "Milkshakes & Ice Cream",
    image: photo("photo-1572490122747-3968b75cc699"),
    available: true,
    featured: true,
    supplier: "Dallas Grill",
    variants: [v("regular", "Regular", 400)], // Base: 300
  },
  {
    id: "icecream-cone",
    name: "Ice Cream Cone",
    description: "Classic ice cream cone.",
    category: "Milkshakes & Ice Cream",
    image: "https://www.kemzykemzy.com/wp-content/uploads/2021/09/Yolo-Ice-Cream.jpeg",
    available: true,
    supplier: "Dallas Grill",
    variants: [v("regular", "Regular", 80)], // Base: 50
  },
  {
    id: "icecream-glass-small",
    name: "Glass Ice Cream (Small)",
    description: "Vanilla, Strawberry, Mango, Blueberry, Pistachio, Salted Caramel, Oreo, Chocolate.",
    category: "Milkshakes & Ice Cream",
    image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0aX2bOWWG4xWEMwW-0I0h7KPVM7EcTQG9CMSCyrfweg&s=10",
    available: true,
    supplier: "Dallas Grill",
    variants: [v("small", "Small", 200)], // Base: 150
  },

  // ==========================================
  // BARISTA CORNER (Base: 250 -> Sell: 350)
  // ==========================================
  {
    id: "cappuccino",
    name: "Cappuccino",
    description: "Espresso with steamed milk and a layer of foam.",
    category: "Barista Corner",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYGsxgUDN7xMVHPMD4b77RwmHwTn-HmJAxb8jAXMv2tY4OqbufLO-l44M&s=10",
    available: true,
    supplier: "Dallas Grill Barista",
    variants: [v("regular", "Regular", 350)], 
  },
  {
    id: "latte",
    name: "Café Latte",
    description: "Smooth espresso with steamed milk and a delicate foam.",
    category: "Barista Corner",
    image: "https://images.ctfassets.net/0e6jqcgsrcye/53teNK4AvvmFIkFLtEJSEx/4d3751dcad227c87b3cf6bda955b1649/Cafe_au_lait.jpg",
    available: true,
    featured: true,
    supplier: "Dallas Grill Barista",
    variants: [v("regular", "Regular", 350)], 
  },
  {
    id: "mocha",
    name: "Café Mocha",
    description: "Espresso with steamed milk and chocolate.",
    category: "Barista Corner",
    image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIvqTPP7scPkQAFfvsC3pB3yTgCaLvCWMZ8gf5FJnTSA&s=10",
    available: true,
    supplier: "Dallas Grill Barista",
    variants: [v("regular", "Regular", 350)], 
  },
];

export const categories: Category[] = [
  "Featured",
  "Grill & Bites",
  "Milkshakes & Ice Cream",
  "Juices & Mocktails",
  "Barista Corner",
];

export const deliveryZones: DeliveryZone[] = [
  {
    id: "kiambu",
    name: "Kiambu Town",
    fee: 80,
    minimum: 0,
    available: true,
    eta: "30–45 min",
    freeAbove: 1000,
  },
  {
    id: "ndumberi",
    name: "Ndumberi",
    fee: 150,
    minimum: 0,
    available: true,
    eta: "40–55 min",
  },
  {
    id: "thindigua",
    name: "Thindigua",
    fee: 190,
    minimum: 0,
    available: true,
    eta: "45–60 min",
  },
  {
    id: "ruiru",
    name: "Ruiru",
    fee: 400,
    minimum: 0,
    available: true,
    eta: "50–70 min",
  },
  {
    id: "other",
    name: "Other area",
    fee: 0,
    minimum: 0,
    available: false,
    eta: "Contact us",
    restriction: "Delivery coverage has not been configured for this area.",
  },
];

// Keep the rest of your loadSheetMenu function exactly as it is below this line...
type MenuRow = Record<string, unknown>;

const truthy = (value: unknown) => value === true || String(value).toLowerCase() === "true";

export async function loadSheetMenu(): Promise<Product[] | null> {
  const endpoint = import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT;
  if (!endpoint) return null;
  const url = new URL(endpoint);
  url.searchParams.set("action", "getMenu");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Menu could not be loaded");
  const rows = (await response.json()) as MenuRow[];
  const allowed = new Set<Category>(categories.filter((category) => category !== "Featured"));
  const menu = rows.flatMap((row, index): Product[] => {
    const category = String(row.category || "Meals") as Category;
    if (!row.productId || !row.name || !allowed.has(category)) return [];
    let variants: Variant[];
    try {
      const parsed = typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants;
      variants =
        Array.isArray(parsed) && parsed.length
          ? parsed.map((item, variantIndex) => ({
              id: String(item.id || `v${variantIndex + 1}`),
              label: String(item.label || item.name || "Regular"),
              price: Number(item.price || row.price || 0),
              packagingRequired: false,
              packagingFee: 0,
              packagingQuantity: 0,
            }))
          : [v("regular", String(row.portion || "Regular"), Number(row.price || 0))];
    } catch {
      variants = [v("regular", String(row.portion || "Regular"), Number(row.price || 0))];
    }
    return [
      {
        id: String(row.productId),
        name: String(row.name),
        description: String(row.description || ""),
        category,
        image: String(row.imageUrl || photo("photo-1771285119318-b342c3ecc51c")),
        available: row.available === undefined ? true : truthy(row.available),
        featured: truthy(row.featured),
        supplier: String(row.supplier || "Savorly"),
        variants,
      },
    ];
  });
  return menu.length ? menu : null;
}