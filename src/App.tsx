

import { 
  Search, MapPin, ShoppingBag, Plus, Minus, X, ArrowRight, Check, 
  User, Clock, Shield, History, Heart, Star, Phone
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

import type { FormEvent, ReactNode } from "react";
import {
  categories,
  deliveryZones,
  loadSheetMenu,
  products,
  type DeliveryZone,
  type Product,
  type Variant,
} from "./data";

import {
  calculateTotals,
  createPayload,
  makeOrderId,
  submitFeedback,
  submitToSheets,
  whatsappMessage,
  VALID_PROMOS, // <-- ADD THIS
  type CartLine,
  type CustomerDetails,
  type GeoPin,
  type OrderPayload,
} from "./order";

const PHONE = "254792211741";
const money = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const iconProps = { size, strokeWidth: 1.8 };
  
  switch (name) {
    case "search": return <Search {...iconProps} />;
    case "pin": return <MapPin {...iconProps} />;
    case "bag": return <ShoppingBag {...iconProps} />;
    case "plus": return <Plus {...iconProps} />;
    case "minus": return <Minus {...iconProps} />;
    case "close": return <X {...iconProps} />;
    case "arrow": return <ArrowRight {...iconProps} />;
    case "check": return <Check {...iconProps} />;
    case "user": return <User {...iconProps} />;
    case "clock": return <Clock {...iconProps} />;
    case "shield": return <Shield {...iconProps} />;
    case "history": return <History {...iconProps} />;
    case "heart": return <Heart {...iconProps} />;
    case "star": return <Star {...iconProps} />;
    case "whatsapp": return <Phone {...iconProps} />; // Fallback for WhatsApp
    default: return null;
  }
}


const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(5, "Full address required"),
  time: z.string(),
  payment: z.string(),
  instructions: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, "You must agree to the privacy policy"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;


function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

const slugify = (value: string) => value.replace(/ /g, "-");

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [close]);
  return (
    <div className="overlay" onMouseDown={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={close} aria-label="Close">
          <Icon name="close" />
        </button>
        {children}
      </section>
    </div>
  );
}

type Profile = { 
  name: string; 
  phone: string; 
  address: string; 
  zoneId: string; 
  ordersPlaced: number; // <-- Added this
};

function LocationSelector({
  zone,
  pin,
  select,
  setPin,
  close,
}: {
  zone: DeliveryZone | null;
  pin: GeoPin | null;
  select: (z: DeliveryZone) => void;
  setPin: (pin: GeoPin) => void;
  close: () => void;
}) {
  const [manual, setManual] = useState("");
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");

  const locate = () => {
    setLocating(true);
    setNotice("");
    
    if (!navigator.geolocation) {
      setLocating(false);
      setNotice("Location is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setPin({ lat, lng, accuracy });
        setNotice("Location pinned. Finding your area...");

        // --- THE MAGIC: Reverse Geocoding ---
                       try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const data = await response.json();
          
          const detectedArea = data.locality || data.city || data.principalSubdivision || "Unknown Area";
          const userArea = detectedArea.toLowerCase();
          
          const matchedZone = deliveryZones.find((z) => 
            userArea.includes(z.name.toLowerCase()) || 
            z.name.toLowerCase().includes(userArea)
          );

          if (matchedZone && matchedZone.available) {
            select(matchedZone);
            setNotice(`Auto-detected: ${matchedZone.name}. Click it to confirm.`);
          } else {
            // THE FIX: Block out-of-bounds users
            setNotice(`We detected you are in ${detectedArea}. Unfortunately, we do not deliver there yet. Please choose Pickup at checkout, or select a zone closest to you.`);
          }
        } catch (error) {
          setNotice("Pin captured, but we couldn't auto-detect your area. Please select your zone below.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        setNotice(
          error.code === 1
            ? "Location permission was declined. Enable it in your browser settings or enter your address manually."
            : "We could not get an accurate position. Move near a window and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Modal title="Choose delivery location" close={close}>
      <div className="modal-pad location-modal">
        <p className="eyebrow">DELIVERY LOCATION</p>
        <h2>Where should we deliver?</h2>
        <p>
          Choose a configured zone to see its fee before adding your details.
          Coverage shown is demonstration data.
        </p>
        <label className="search-field">
          <Icon name="search" />
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Search estate or area"
          />
        </label>
        <button className="use-location" onClick={locate} disabled={locating}>
          <Icon name="pin" />
          <span>
            <strong>
              {locating ? "Finding your location…" : "Use current location"}
            </strong>
            <small>Permission is only requested when you tap here.</small>
          </span>
        </button>
        {notice && <p className="notice">{notice}</p>}
        {pin && (
          <div className="map-pin">
            <iframe
              title="Your selected delivery location"
              src={`https://maps.google.com/maps?q=${pin.lat},${pin.lng}&z=17&output=embed`}
              loading="lazy"
            />
            <div>
              <span>
                <strong>Pin captured</strong>
                <small>
                  {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)} · accuracy about{" "}
                  {Math.round(pin.accuracy)} m
                </small>
              </span>
              <a
                href={`https://maps.google.com/?q=${pin.lat},${pin.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open map
              </a>
            </div>
          </div>
        )}
                <div className="zone-list">
          {deliveryZones.filter((z) => z.name.toLowerCase().includes(manual.toLowerCase())).length > 0 ? (
            deliveryZones
              .filter((z) => z.name.toLowerCase().includes(manual.toLowerCase()))
              .map((z) => (
                <button
                  key={z.id}
                  className={zone?.id === z.id ? "selected" : ""}
                  onClick={() => {
                    if (z.available) {
                      select(z);
                      close();
                    } else {
                      setNotice(
                        `We do not currently deliver to ${z.name}. Please contact us directly to arrange a special delivery or choose Pickup.`
                      );
                    }
                  }}
                >
                  <span>
                    <strong>{z.name}</strong>
                    <small>
                      {z.available
                        ? `${z.eta} · ${z.fee ? money(z.fee) : "No delivery fee"}`
                        : "Contact us to confirm coverage"}
                    </small>
                  </span>
                  <b>{z.available ? money(z.fee) : "Ask us"}</b>
                </button>
              ))
          ) : (
            <div className="empty-zones" style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ color: "var(--muted)", marginBottom: "15px" }}>
                We couldn't find that area. We currently only deliver to Kiambu, Ndumberi, Thindigua, and Ruiru.
              </p>
              <a 
                href={`https://wa.me/254792211741?text=${encodeURIComponent("Hi Savorly, I am located in an area outside your delivery zones. Can you deliver to me?")}`}
                target="_blank" 
                rel="noreferrer"
                className="primary"
                style={{ display: "inline-flex", textDecoration: "none", background: "var(--green)" }}
              >
                Ask us on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}



function ProductModal({
  product,
  add,
  close,
}: {
  product: Product;
  add: (v: Variant, spice?: string) => void;
  close: () => void;
}) {
  const [variant, setVariant] = useState(product.variants[0]);
  const [spice, setSpice] = useState(product.spiceOptions ? product.spiceOptions[0] : undefined);

  return (
    <Modal title={product.name} close={close}>
      <img className="detail-image" src={product.image} alt={product.name} />
      <div className="modal-pad">
        <p className="eyebrow">{product.category}</p>
        <h2>{product.name}</h2>
        <p className="detail-copy">{product.description}</p>
        
        <fieldset>
          <legend>Choose a size</legend>
          {product.variants.map((v) => (
            <label className="variant" key={v.id}>
              <input
                type="radio"
                checked={variant.id === v.id}
                onChange={() => setVariant(v)}
              />
              <span>{v.label}</span>
              <strong>{money(v.price)}</strong>
            </label>
          ))}
        </fieldset>


                {/* SPICE LEVEL UI */}
        {product.spiceOptions && (
          <fieldset style={{ marginTop: "20px", borderTop: "1px dashed var(--line)", paddingTop: "15px" }}>
            <legend style={{ fontWeight: "bold", marginBottom: "10px" }}>Spice Level</legend>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {product.spiceOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpice(s)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "999px",
                    border: `1px solid ${spice === s ? "var(--green)" : "var(--line)"}`,
                    background: spice === s ? "var(--green)" : "white",
                    color: spice === s ? "white" : "var(--ink)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}

       

        <button
          className="primary wide"
          style={{ marginTop: "24px" }}
          onClick={() => {
            add(variant, spice);
            close();
          }}
        >
          Add to cart · {money(variant.price)}
        </button>
      </div>
    </Modal>
  );
}

function ProductCard({
  product,
  open,
}: {
  product: Product;
  open: () => void;
}) {
  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`product-card ${!product.available ? "sold" : ""}`}
    >
      <button
        className="product-image"
        onClick={open}
        disabled={!product.available}
      >
        <img
          src={product.image}
          alt={`${product.name} from Savorly`}
          loading="lazy"
        />
        {product.featured && <span>Popular</span>}
        {!product.available && <b>Sold out</b>}
      </button>
      <div className="product-copy">
        <div className="product-info">
          <div className="availability">
            <i className={product.available ? "available" : ""} />
            {product.available ? "Available" : "Currently unavailable"}
          </div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <small>{product.variants.map((v) => v.label).join(" · ")}</small>
        </div>
        <div className="product-bottom">
          <strong>From {money(product.variants[0].price)}</strong>
          <button
            className="add"
            onClick={open}
            disabled={!product.available}
            aria-label={`Add ${product.name}`}
          >
            <Icon name="plus" size={17} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Summary({ totals, zone, promo }: { totals: ReturnType<typeof calculateTotals>; zone: DeliveryZone | null; promo: string }) {

  return (
    <div className="summary">
      <p>
        <span>Food subtotal</span>
        <strong>{money(totals.items)}</strong>
      </p>
      <p>
        <span>Delivery</span>
        <strong style={{ color: totals.delivery === 0 ? "var(--green)" : "inherit" }}>
          {totals.delivery === 0 ? "FREE" : money(totals.delivery)}
        </strong>
      </p>
            {totals.discount > 0 && (
        <p className="discount" style={{ color: "var(--green)", fontWeight: "bold" }}>
          <span>Discount ({promo})</span>
          <strong>−{money(totals.discount)}</strong>
        </p>
      )}
      
      {/* Upsell prompt */}
      {zone?.freeAbove && totals.items < zone.freeAbove && (
        <p style={{ 
          background: '#f4f7f5', padding: '8px', borderRadius: '6px', 
          fontSize: '10px', color: 'var(--green)', marginTop: '10px', fontWeight: 600
        }}>
          Add {money(zone.freeAbove - totals.items)} more for FREE delivery!
        </p>
      )}

      <p className="grand">
        <span>Total to pay</span>
        <strong>{money(totals.grand)}</strong>
      </p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<
    "shop" | "checkout" | "submitted" | "privacy" | "terms"
  >("shop");
  const [catalog, setCatalog] = useState(products);
  const [menuState, setMenuState] = useState<
    "fallback" | "loading" | "live" | "error"
  >("fallback");
  const [cart, setCart] = useState<CartLine[]>(() => read("savorly-cart", []));

     const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"delivery" | "collection">("delivery");
  
  // Real-time date helpers
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const [selectedDay, setSelectedDay] = useState(formatDate(today)); 
  const [selectedTime, setSelectedTime] = useState("12:00"); // Default time
  const [zone, setZone] = useState<DeliveryZone | null>(() =>
    read("savorly-zone", null),
  );
  const [pin, setPin] = useState<GeoPin | null>(() =>
    read("savorly-pin", null),
  );
  const [profile, setProfile] = useState<Profile>(() =>
  read("savorly-profile", { name: "", phone: "", address: "", zoneId: "", ordersPlaced: 0 }),
);
  const [orderHistory, setOrderHistory] = useState<OrderPayload[]>(() =>
    read("savorly-order-history", []),
  );
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("Featured");
  const [locationOpen, setLocationOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  const [hasConsented, setHasConsented] = useState<boolean>(() => 
    localStorage.getItem("savorly-consent") === "true"
  );

  const [showSplash, setShowSplash] = useState(
    () => !localStorage.getItem("savorly-intro-seen"),
  );
  const [promo, setPromo] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastOrder, setLastOrder] = useState<OrderPayload | null>(() =>
    read("savorly-last-order", null),
  );


    const { register, handleSubmit, formState: { errors }, setValue } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      time: `${selectedDay} at ${selectedTime}`, // <-- Updated
      payment: "Till Number (Pay now)",
      instructions: "",
      consent: hasConsented,
    }
  });

  // Add this useEffect right below the useForm block to keep them in sync
  useEffect(() => {
    setValue("time", `${selectedDay} at ${selectedTime} (${bookingType === "delivery" ? "Delivery" : "Collection"})`);
  }, [selectedDay, selectedTime, bookingType, setValue]);

  // 1. TIP STATE
  const [tipAmount, setTipAmount] = useState(0);

  // 2. VIP LIST FUNCTION
  const joinVipList = async () => {
    if (!profile.phone) return;
    const vipList = JSON.parse(localStorage.getItem("savorly-vip") || "[]");
    if (!vipList.includes(profile.phone)) {
      vipList.push(profile.phone);
      localStorage.setItem("savorly-vip", JSON.stringify(vipList));
    }
    setToast("Welcome to Savorly VIP! Check your WhatsApp soon.");
    
    try {
      await fetch(import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "marketing_optin", phone: profile.phone, name: profile.name }),
      });
    } catch { /* silently fail */ }
  };

  // 3. FEEDBACK ON RETURN (When they close WhatsApp)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && lastOrder) {
        const alreadyRated = localStorage.getItem(`savorly-feedback-${lastOrder.orderId}`);
        // Only trigger if not rated and it's their 1st or 5th order
        if (!alreadyRated && (profile.ordersPlaced === 1 || profile.ordersPlaced % 5 === 0)) {
          setFeedbackOpen(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lastOrder, profile.ordersPlaced]);



  const totals = useMemo(
    () => calculateTotals(cart, zone, promo),
    [cart, zone, promo],
  );
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const historyStats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 86400000;
    const month = 30 * 86400000;
    const timestamp = (order: OrderPayload) =>
      new Date(order.operations.submissionTimestamp).getTime();
    return {
      total: orderHistory.reduce(
        (sum, order) => sum + order.financials.grand,
        0,
      ),
      week: orderHistory
        .filter((order) => now - timestamp(order) <= week)
        .reduce((sum, order) => sum + order.financials.grand, 0),
      month: orderHistory
        .filter((order) => now - timestamp(order) <= month)
        .reduce((sum, order) => sum + order.financials.grand, 0),
    };
  }, [orderHistory]);
  useEffect(
    () => localStorage.setItem("savorly-cart", JSON.stringify(cart)),
    [cart],
  );
  useEffect(() => {
    if (zone) localStorage.setItem("savorly-zone", JSON.stringify(zone));
  }, [zone]);
  useEffect(() => {
    if (pin) localStorage.setItem("savorly-pin", JSON.stringify(pin));
  }, [pin]);
  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      localStorage.setItem("savorly-intro-seen", "true");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [showSplash]);
  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT) return;
    setMenuState("loading");
    loadSheetMenu()
      .then((menu) => {
        if (menu) {
          setCatalog(menu);
          setMenuState("live");
        } else setMenuState("fallback");
      })
      .catch(() => setMenuState("error"));
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

    const add = (product: Product, variant: Variant, spice?: string) => {
    const key = `${product.id}-${variant.id}-${spice || "none"}`;
    setCart((old) =>
      old.some((l) => l.key === key)
        ? old.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + 1 } : l,
          )
        : [...old, { key, product, variant, quantity: 1, spice }],
    );
    setToast(`${product.name} added to cart`);
  };
  const update = (key: string, q: number) =>
    setCart((old) =>
      old
        .map((l) => (l.key === key ? { ...l, quantity: q } : l))
        .filter((l) => l.quantity > 0),
    );
  const navigate = (v: typeof view) => {
    setView(v);
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const visible = catalog.filter(
    (p) =>
      !search ||
      `${p.name} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const sections = search ? ["Search results"] : categories;
  const quickWhatsapp = `https://wa.me/${PHONE}?text=${encodeURIComponent("Hi Savorly, I would like help placing an order.")}`;
     const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const promoData = VALID_PROMOS[code];

    if (!promoData) {
      setPromo("");
      setToast("Invalid promo code.");
      return;
    }

    if (totals.items < promoData.minSpend) {
      setPromo("");
      setToast(`Minimum spend of ${money(promoData.minSpend)} required for this code.`);
      return;
    }

    setPromo(code);
    setToast(`${promoData.label} applied!`);
  };
  const reorder = (order = lastOrder) => {
    if (!order) return;
    const restored = order.items.flatMap((item) => {
      const p = catalog.find((x) => x.id === item.productId);
      const v = p?.variants.find((x) => x.label === item.variant);
      return p && v && p.available
        ? [
            {
              key: `${p.id}-${v.id}`,
              product: p,
              variant: v,
              quantity: Number(item.quantity),
            },
          ]
        : [];
    });
    setCart(restored);
    navigate("shop");
    setCartOpen(true);
  };




      const getRecommendations = () => {
    if (cart.length === 0) return [];
    const cartCategories: string[] = cart.map(l => l.product.category);
    const cartIds = cart.map(l => l.product.id);
    let suggestions: Product[] = [];

    // 1. If they bought food, suggest a drink (High margin upsell)
    if (cartCategories.includes("Grill & Bites") || cartCategories.includes("Snacks")) {
      suggestions.push(...catalog.filter(p => 
        (p.category === "Juices & Mocktails" || p.category === "Milkshakes & Ice Cream" || p.category === "Barista Corner") 
        && !cartIds.includes(p.id)
      ));
    }

    // 2. If they bought a drink, suggest a snack or grill item
    if (cartCategories.includes("Juices & Mocktails") || cartCategories.includes("Barista Corner")) {
      suggestions.push(...catalog.filter(p => 
        (p.category === "Grill & Bites" || (p.category as string) === "Snacks") 
        && !cartIds.includes(p.id)
      ));
    }

    // 3. If they bought a milkshake, suggest ice cream
    if (cartCategories.includes("Milkshakes & Ice Cream")) {
      suggestions.push(...catalog.filter(p => 
        p.category === "Milkshakes & Ice Cream" && !cartIds.includes(p.id)
      ));
    }

    // Remove duplicates and limit to 2 suggestions
    return Array.from(new Set(suggestions)).slice(0, 2);
  };

  const recommendedProducts = getRecommendations();




    const onSubmit = async (data: CheckoutFormValues) => {
    if (!zone?.available || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const customer: CustomerDetails = {
      name: data.name,
      phone: data.phone,
      address: data.address,
      deliveryTime: data.time,
      instructions: data.instructions || "",
      paymentMethod: data.payment,
      marketingConsent: data.consent,
    };

        const savedProfile = {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      zoneId: zone.id,
      ordersPlaced: profile.ordersPlaced + 1, // <-- Increment the count here
    };
    setProfile(savedProfile);
    localStorage.setItem("savorly-profile", JSON.stringify(savedProfile));
    localStorage.setItem("savorly-consent", String(data.consent));
    setHasConsented(data.consent);

    const payload = createPayload(
      makeOrderId(),
      cart,
      zone,
      customer,
      totals,
      pin,
      orderHistory.length + 1,
    );
    
    const whatsappWindow = window.open("about:blank", "_blank");
    
    try {
      await submitToSheets(payload);
      localStorage.setItem("savorly-last-order", JSON.stringify(payload));
      setLastOrder(payload);
      const nextHistory = [payload, ...orderHistory].slice(0, 30);
      setOrderHistory(nextHistory);
      localStorage.setItem("savorly-order-history", JSON.stringify(nextHistory));
      
      if (whatsappWindow)
        whatsappWindow.location.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(whatsappMessage(payload, tipAmount))}`;
      else
        window.location.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(whatsappMessage(payload))}`;
      
      setCart([]);
      navigate("submitted");
      
      if (nextHistory.length === 1 || nextHistory.length % 5 === 0)
        window.setTimeout(() => setFeedbackOpen(true), 900);
    } catch {
      whatsappWindow?.close();
      setSubmitError(
        "Order could not be logged. Please try again, use WhatsApp directly, or call the business."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sendFeedback = async () => {
    if (!lastOrder || !rating) return;
    localStorage.setItem(
      `savorly-feedback-${lastOrder.orderId}`,
      JSON.stringify({ rating, comment: feedbackComment }),
    );
    setFeedbackOpen(false);
    setToast("Thank you for rating Savorly");
    try {
      await submitFeedback(lastOrder.orderId, rating, feedbackComment);
    } catch {
      setToast("Rating saved on this device");
    }
  };

  const validPaths = ["/", "/menu"];
  if (!validPaths.includes(window.location.pathname))
    return (
      <main className="not-found">
        <div className="not-found-orb" />
        <button
          className="wordmark"
          onClick={() => {
            window.history.pushState({}, "", "/");
            window.location.reload();
          }}
        >
          Savorly<span>.</span>
        </button>
        <p>404 · LOST IN THE KITCHEN</p>
        <h1>This page is not on today’s menu.</h1>
        <span>
          The food is still waiting. Let’s get you back to something worth
          craving.
        </span>
        <button
          className="primary"
          onClick={() => {
            window.history.pushState({}, "", "/");
            window.location.reload();
          }}
        >
          Back to Savorly <Icon name="arrow" />
        </button>
      </main>
    );

  if (showSplash) {
    return <SplashScreen onComplete={() => {
      setShowSplash(false);
      localStorage.setItem("savorly-intro-seen", "true");
    }} />;
  }

  if (view === "privacy" || view === "terms")
    return (
      <div className="legal-page">
        <button className="wordmark" onClick={() => navigate("shop")}>
          Savorly<span>.</span>
        </button>
        <button className="back" onClick={() => navigate("shop")}>
          ← Back to ordering
        </button>

        {view === "privacy" ? (
          <div className="legal-content">
            <p className="eyebrow">PRIVACY POLICY</p>
            <h1>Your data. Handled with care.</h1>
            <p className="legal-meta">Last Updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>

            <h2>1. Information We Collect</h2>
            <p>Savorly collects only the information necessary to prepare, process, and deliver your food order. This includes:</p>
            <ul>
              <li><strong>Identity & Contact Data:</strong> Your name and phone number (for delivery coordination and rider contact).</li>
              <li><strong>Delivery Data:</strong> Physical address, estate, building name, and GPS coordinates (if you use the "Use current location" feature).</li>
              <li><strong>Order Data:</strong> Items purchased, special instructions (e.g., allergies, gate colors), and payment preferences.</li>
              <li><strong>Marketing Data:</strong> Your preferences for receiving promotional offers via WhatsApp.</li>
            </ul>

            <h2>2. How We Use Your Data</h2>
            <p>We process your data under the legal basis of <strong>Contractual Necessity</strong> (to fulfill your order) and <strong>Consent</strong> (for marketing). Specifically:</p>
            <ul>
              <li>To communicate your order details to our kitchen staff and assigned delivery riders via WhatsApp.</li>
              <li>To calculate accurate delivery fees based on your location.</li>
              <li>To send you VIP offers and discounts (only if you explicitly opt-in).</li>
              <li>To comply with Kenya Revenue Authority (KRA) tax and accounting obligations.</li>
            </ul>

            <h2>3. Third-Party Sharing & WhatsApp</h2>
            <p>Savorly uses WhatsApp (Meta Platforms) as our primary order processing and communication channel. When you place an order, your details are transmitted to our business WhatsApp account. We do not sell your personal data. We may share necessary delivery details with third-party riders solely for the purpose of delivering your food.</p>

            <h2>4. Data Retention & Deletion</h2>
            <p>Order history and transaction records are retained for a minimum of 5 years to comply with Kenyan tax laws. Marketing data is retained until you opt-out. You may request the deletion of your non-financial personal data at any time by contacting us.</p>

            <h2>5. Your Rights (ODPC Compliance)</h2>
            <p>Under the Kenya Data Protection Act (2019), you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Withdraw marketing consent at any time.</li>
              <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya.</li>
            </ul>

            <p className="legal-note">For any privacy-related inquiries, please contact our Data Protection Officer via WhatsApp at 0792 211 741.</p>
          </div>
        ) : (
          <div className="legal-content">
            <p className="eyebrow">TERMS & CONDITIONS</p>
            <h1>Clear terms. Fair dining.</h1>
            <p className="legal-meta">Last Updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>

            <h2>1. Order Acceptance & Pricing</h2>
            <p>All prices displayed on Savorly are in Kenyan Shillings (KSh) and are inclusive of applicable taxes. Placing an order on this platform initiates a WhatsApp message. <strong>Your order is not confirmed until our team replies on WhatsApp to accept it and confirm the delivery time.</strong></p>

            <h2>2. Delivery Zones & Fees</h2>
            <p>Delivery fees are calculated based on your selected zone. While we strive to deliver to all listed areas, extreme weather, traffic, or rider unavailability may affect delivery times. We will communicate any delays via WhatsApp immediately.</p>

            <h2>3. Cancellations & Refunds</h2>
            <p>Because our food is cooked to order, cancellations are only accepted if the order has not yet entered the kitchen preparation stage. To cancel, you must call us directly at 0792 211 741. Once food preparation has begun, the order cannot be cancelled or refunded.</p>
            <p>If you receive incorrect or damaged items, please contact us within 30 minutes of delivery with a photo of the item, and we will arrange a replacement or a refund via M-PESA.</p>

            <h2>4. Allergen & Dietary Warning</h2>
            <p><strong>Important:</strong> Our food is prepared in a commercial kitchen that handles nuts, gluten, dairy, and shellfish. While we take precautions, we cannot guarantee an allergen-free environment. It is your responsibility to inform us of severe allergies in the "Delivery Instructions" box or via WhatsApp.</p>

            <h2>5. Payment Terms</h2>
            <p>We accept M-PESA Till payments and Cash on Delivery. For M-PESA, you must complete the payment before the rider departs the kitchen. Failure to do so may result in order cancellation.</p>
          </div>
        )}
      </div>
    );

  return (
    <div className="app">
      {!online && (
        <div className="offline">You are offline. Your cart is saved.</div>
      )}


              {/* TOP ANNOUNCEMENT BAR */}
      <div className="top-bar">
         <span>Food, Drinks & Sweets · Delivered in Kiambu · WhatsApp 0792 211 741</span>
        <div className="top-bar-links">
          <button onClick={() => navigate("shop")}>Order Food</button>
          <button onClick={() => setLocationOpen(true)}>Delivery Zones</button>
          <button onClick={() => setIsScheduleOpen(true)}>Schedule Delivery</button>
        </div>
      </div>

                       {/* HEADER */}
      <header className="site-header">
        <div className="header-row">
          <button className="wordmark" onClick={() => navigate("shop")}>
            Savorly<span>.</span>
          </button>

          <button
            className="location-chip"
            onClick={() => setLocationOpen(true)}
          >
            <Icon name="pin" />
            <span>
              <small>Delivering to</small>
              <strong>{zone?.name || "Choose location"}</strong>
            </span>
            <b>⌄</b>
          </button>

          <label className="global-search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                navigate("shop");
              }}
              placeholder="Search food, drinks and fresh cuts..."
            />
          </label>
          
          <div className="header-actions">
            <button className="account" onClick={() => setProfileOpen(true)}>
              <Icon name="user" />
              <span>{profile.name ? profile.name.split(" ")[0] : "Account"}</span>
            </button>
            
            <button className="header-cart" onClick={() => setCartOpen(true)}>
              <Icon name="bag" />
              <span>Cart</span>
              <b>{count}</b>
            </button>
          </div>
        </div>
      </header>

      {view === "shop" && (
        <main>
                     <section className="hero">
            <div className="hero-content">
              <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.15em" }}>SAVORLY KITCHEN</p>
              
              <h1 style={{ marginTop: "16px", marginBottom: "24px" }}>
                Cravings.<br />
                Delivered with care.
              </h1>
              
              <p className="hero-intro" style={{ lineHeight: "1.8", marginBottom: "32px", maxWidth: "400px" }}>
                
                Your favorite treats, delivered exactly when you want them.
              </p>
              
              <form 
                className="hero-search" 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (search.trim()) {
                    document.getElementById("menu-catalogue")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                style={{ marginBottom: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}
              >
                <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
                  <Icon name="search" />
                </button>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search food, drinks, or snacks..."
                />
              </form>

              <div className="hero-buttons" style={{ display: "flex", gap: "16px" }}>
                <button className="btn-primary" onClick={() => document.getElementById("menu-catalogue")?.scrollIntoView({ behavior: "smooth" })}>
                  Savour Menu
                </button>
                <button className="btn-secondary" onClick={() => setIsScheduleOpen(true)}>
                  Schedule a Time
                </button>
              </div>
            </div>
            <div className="hero-image-container" />
          </section>

                    {/* SAVORLY AT WORK SECTION */}
          <section className="work-section" id="office-orders" style={{ 
            background: "var(--soft)", 
            padding: "60px 40px", 
            borderRadius: "24px", 
            margin: "60px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "30px"
          }}>
            <div style={{ maxWidth: "500px" }}>
              <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.15em", fontWeight: 700 }}>SAVORLY AT WORK</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "38px", color: "var(--green)", marginTop: "10px", marginBottom: "15px" }}>Lunch for the team.</h2>
              <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: "1.7" }}>
                Ordering for an office, a meeting, or a group? We handle bulk orders 
                with clear pricing, scheduled delivery, and one simple bill.
              </p>
            </div>
            <a 
              href={`https://wa.me/${PHONE}?text=${encodeURIComponent("Hi Savorly, I'd like to arrange a team lunch order.")}`} 
              target="_blank" 
              rel="noreferrer"
              className="btn-gold"
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              Arrange a Team Lunch
            </a>
          </section>

          {/* PROMO BANNER - FIXED COLORS */}
          <div className="promo-banner" style={{
            background: "var(--green)",
            borderRadius: "24px",
            padding: "50px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "30px",
            marginBottom: "60px"
          }}>
            <div style={{ maxWidth: "500px" }}>
              <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.15em", fontWeight: 700 }}>ONLINE OFFER</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: "38px", marginTop: "10px", marginBottom: "15px" }}>Get KSh 100 off your first order.</h2>
              <p style={{ color: "#c9d6cf", fontSize: "15px" }}>Use code <strong style={{ color: "white", background: "#ffffff20", padding: "4px 8px", borderRadius: "4px" }}>WELCOME100</strong> at checkout. Valid for orders over KSh 500.</p>
            </div>
            <button className="btn-gold" onClick={() => document.getElementById("menu-catalogue")?.scrollIntoView({ behavior: "smooth" })}>
              SAUVOUR THE MENU
            </button>
          </div>

          {menuState === "error" && (
            <div className="menu-alert">
              <strong>Live menu is temporarily unavailable.</strong>
              <span>
                Showing the saved menu. Prices and availability will be
                confirmed on WhatsApp.
              </span>
            </div>
          )}
          <section className="featured">
            <div className="section-head">
              <div>
                <p className="eyebrow">POPULAR RIGHT NOW</p>
                <h2>Start with a favourite</h2>
              </div>
              <p>
                {menuState === "live"
                  ? "Live menu synced from Savorly"
                  : "Fresh picks for your next order"}
              </p>
            </div>
            <div className="feature-scroll">
              {catalog
                .filter((p) => p.featured)
                .map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    open={() => setSelected(p)}
                  />
                ))}
            </div>
          </section>
                    <div className="catalogue" id="menu-catalogue">

            <aside>
              <p>Browse menu</p>
              {categories.map((c) => (
                <button
                  className={active === c ? "active" : ""}
                  onClick={() => {
                    setActive(c);
                    document
                      .getElementById(slugify(c))
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  key={c}
                >
                  {c}
                  <span>›</span>
                </button>
              ))}
            </aside>
            <div className="products">
              <nav className="mobile-categories">
                {categories.map((c) => (
                  <button
                    className={active === c ? "active" : ""}
                    onClick={() => {
                      setActive(c);
                      document
                        .getElementById(slugify(c))
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    key={c}
                  >
                    {c}
                  </button>
                ))}
              </nav>
              {sections.map((category) => {
                const list = search
                  ? visible
                  : category === "Featured"
                    ? visible.filter((p) => p.featured)
                    : visible.filter((p) => p.category === category);
                if (!list.length) return null;
                return (
                  <section
                    className="product-section"
                    id={slugify(category)}
                    key={category}
                  >
                    <div className="section-head">
                      <div>
                        <h2>{category}</h2>
                        <p>
                          {category === "Fresh Cuts" || category === "Marinated"
                            ? "Choose your preferred weight before adding."
                            : "Prepared with care and packed for your order."}
                        </p>
                      </div>
                      <span>{list.length} items</span>
                    </div>
                    <div className="product-grid">
                      {list.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          open={() => setSelected(p)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
              {!visible.length && (
                <div className="empty">
                  <h2>No matches found</h2>
                  <p>Try a different food, drink or category.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {view === "checkout" && (
        <main className="checkout">
          <button className="back" onClick={() => setCartOpen(true)}>
            ← Edit cart
          </button>
          <div className="checkout-title">
            <p className="eyebrow">GUEST CHECKOUT · NO ACCOUNT NEEDED</p>
            <h1>Delivery details</h1>
            <p>Review every charge before placing your WhatsApp order.</p>
          </div>


                    <form onSubmit={handleSubmit(onSubmit)}>
            <div className="checkout-form">
              <section>
                <div className="step">
                  <b>1</b>
                  <div>
                    <h2>Contact</h2>
                    <p>
                      {profile.name ? "Welcome back. Your saved details are ready." : "Used only to coordinate this order."}
                    </p>
                  </div>
                </div>
                <div className="two">
                  <label>
                    Full name
                    <input
                      {...register("name")}
                      autoComplete="name"
                      className={errors.name ? "input-error" : ""}
                    />
                    {errors.name && <span className="error-text">{errors.name.message}</span>}
                  </label>
                  <label>
                    Phone number
                    <input
                      {...register("phone")}
                      type="tel"
                      autoComplete="tel"
                      placeholder="07XX XXX XXX"
                      className={errors.phone ? "input-error" : ""}
                    />
                    {errors.phone && <span className="error-text">{errors.phone.message}</span>}
                  </label>
                </div>
              </section>

              <section>
                <div className="step">
                  <b>2</b>
                  <div>
                    <h2>Delivery</h2>
                    <p>Current fee: {zone ? money(zone.fee) : "Choose a zone"}</p>
                  </div>
                </div>

                <button type="button" className="checkout-zone" onClick={() => setLocationOpen(true)}>
                  <Icon name="pin" />
                  <span>
                    <strong>{zone?.name || "Choose delivery zone"}</strong>
                    <small>{zone ? `${zone.eta} · ${money(zone.fee)} delivery` : "Required to calculate your total"}</small>
                  </span>
                  <b>Change</b>
                </button>

                {zone && !zone.available && (
                  <div className="error" style={{ marginTop: '15px' }}>
                    <p style={{ marginBottom: '10px' }}>
                      <strong>Sorry, we cannot deliver to this location.</strong> We are based in Kiambu Town. Please select a different zone or choose Pickup.
                    </p>
                    <a href={`tel:+${PHONE}`} className="primary wide" style={{ display: 'inline-flex', textDecoration: 'none', background: '#202522' }}>
                      <Icon name="whatsapp" /> Call Savorly to arrange
                    </a>
                  </div>
                )}

                <label>
                  Street, estate, building and landmark
                  <textarea
                    {...register("address")}
                    autoComplete="street-address"
                    placeholder="e.g. Kiambu Town, Biashara Street, opposite…, apartment 4B"
                    className={errors.address ? "input-error" : ""}
                  />
                  {errors.address && <span className="error-text">{errors.address.message}</span>}
                </label>

                <div className="two">
                                   <div style={{ background: "var(--soft)", padding: "20px", borderRadius: "8px", border: "1px solid var(--line)", marginTop: "13px", gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>Scheduled For</p>
                        <h3 style={{ fontSize: "16px", color: "var(--green)", fontWeight: 600 }}>
                          {selectedDay} at {selectedTime} ({bookingType === "delivery" ? "Delivery" : "Collection"})
                        </h3>
                      </div>
                                            <button 
                        type="button" 
                        onClick={() => setIsScheduleOpen(true)}
                        style={{ fontSize: "12px", color: "var(--green)", textDecoration: "underline", fontWeight: 600 }}
                      >
                        Change time
                      </button>
                    </div>
                  </div>
                  <label>
                    Payment method
                    <select {...register("payment")}>
                      <option value="Till Number (Pay now)">M-PESA. Pay to Till Number (1658917)</option>
                      <option value="Cash on delivery">Cash on Delivery</option>
                    </select>
                  </label>
                </div>

                <label>
                  Delivery instructions
                  <textarea
                    {...register("instructions")}
                    placeholder="Gate colour, rider directions, allergies or preparation notes"
                  />
                </label>
              </section>

              <section>
                <div className="step">
                  <b>3</b>
                  <div>
                    <h2>Privacy</h2>
                    <p>Required delivery processing and optional marketing are separate.</p>
                  </div>
                </div>
                <label className="consent">
                  <input type="checkbox" {...register("consent")} />
                  <span>
                    I understand my delivery details will be shared with the fulfilment team and assigned rider. Read the{" "}
                    <button type="button" onClick={() => navigate("privacy")}>Privacy Policy</button>.
                  </span>
                </label>
                {errors.consent && <span className="error-text" style={{ marginBottom: "15px" }}>{errors.consent.message}</span>}
              </section>
            </div>

            <aside className="checkout-summary">
              <p className="eyebrow">ORDER SUMMARY</p>
              <div className="checkout-items">
                {cart.map((l) => (
                  <p key={l.key}>
                    <span>{l.quantity} × {l.product.name}<small>{l.variant.label}</small></span>
                    <strong>{money(l.variant.price * l.quantity)}</strong>
                  </p>
                ))}
              </div>



              {/* added */}
                                {/* SMART RECOMMENDATIONS */}
                  {recommendedProducts.length > 0 && (
                    <div style={{ marginTop: "20px", borderTop: "1px dashed var(--line)", paddingTop: "15px" }}>
                      <p className="eyebrow" style={{ marginBottom: "10px" }}>SMART RECOMMENDATIONS</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {recommendedProducts.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--paper)", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img src={p.image} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                              <div>
                                <strong style={{ fontSize: "12px", display: "block", color: "var(--ink)" }}>{p.name}</strong>
                                <small style={{ fontSize: "10px", color: "var(--muted)" }}>+ {money(p.variants[0].price)}</small>
                              </div>
                            </div>
                            <button 
                              onClick={() => add(p, p.variants[0])}
                              style={{ background: "var(--green)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "grid", placeItems: "center", cursor: "pointer" }}
                            >
                              <Icon name="plus" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}






                            <Summary totals={totals} zone={zone} promo={promo} />
              {submitError && <p className="error">{submitError}</p>}
              <button className="primary wide" disabled={!zone?.available || !cart.length || submitting}>
                {submitting ? "Preparing order…" : "Place order on WhatsApp"}
                <Icon name="whatsapp" />
              </button>
              <small>Sending does not confirm your order. Wait for business confirmation on WhatsApp.</small>
            </aside>
          </form>
        </main>
      )}

            {view === "submitted" && (
        <main className="submitted">
          <span>
            <Icon name="whatsapp" size={34} />
          </span>
          <p className="eyebrow">AWAITING CONFIRMATION</p>
          <h1>Your order is ready in WhatsApp.</h1>
          <p>
            Tap Send in WhatsApp. Savorly must confirm availability, payment and
            delivery time before the order is accepted.
          </p>

          <div className="status-line">
            <b className="active pulse">Order received</b>
            <b>Confirmed</b>
            <b>Preparing</b>
            <b>On the way</b>
            <b>Delivered</b>
          </div>
          <p className="status-note">
            This page does not update automatically without a supported backend integration.
          </p>

          <div className="submitted-actions">
            <a
              className="primary"
              href={`https://wa.me/${PHONE}?text=${encodeURIComponent(lastOrder ? whatsappMessage(lastOrder, tipAmount) : "")}`}
              target="_blank"
              rel="noreferrer"
            >
              Return to WhatsApp
            </a>
            {lastOrder && (
              <button onClick={() => reorder()}>Order again</button>
            )}
          </div>

                    {/* TIP SECTION */}
          <div className="submitted-card">
            <h3>Show the rider some love?</h3>
            <p>100% of your tip goes directly to the rider.</p>
            <div className="tip-options">
              <button onClick={() => { setTipAmount(50); setToast("KSh 50 tip added!"); }}>+ KSh 50</button>
              <button onClick={() => { setTipAmount(100); setToast("KSh 100 tip added!"); }}>+ KSh 100</button>
              <button onClick={() => { setTipAmount(200); setToast("KSh 200 tip added!"); }}>+ KSh 200</button>
            </div>
            {tipAmount > 0 && (
              <p style={{ marginTop: "10px", color: "var(--green)", fontWeight: "bold" }}>
                You have tipped KSh {tipAmount}. Send it via the WhatsApp message.
              </p>
            )}
          </div>

          {/* VIP SECTION */}
          <div className="submitted-card">
            <h3>Get KSh 100 off your next order</h3>
            <p>Join the Savorly VIP list for exclusive WhatsApp offers.</p>
            <button className="primary wide" onClick={joinVipList}>
              Join the VIP List
            </button>
          </div>

          {/* INLINE FEEDBACK CARD */}
          <div className="submitted-card">
            <h3>How was the ordering experience?</h3>
            <p>Your feedback helps us improve Savorly.</p>
            <div className="stars" aria-label="Choose a rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={rating >= star ? "selected" : ""}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                >
                  <Icon name="star" size={28} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <button 
                className="primary wide" 
                style={{ marginTop: "15px" }}
                onClick={sendFeedback}
              >
                Submit {rating}-star rating
              </button>
            )}
          </div>

          {/* SHARE SECTION */}
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="back-link"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "13px" }}
            >
              <Icon name="instagram" size={18} /> Share your order on Instagram
            </a>
          </div>

         

        

        </main>
      )}

            <footer>
        <div>
          <button className="wordmark" onClick={() => navigate("shop")} style={{ color: "white" }}>
            Savorly<span>.</span>
          </button>
          <p>
            Good food, whenever you crave it. Built for simple, transparent delivery ordering in Kiambu.
          </p>
          <div className="footer-badges">
            <span>🔒 Secure Ordering</span>
            <span>🇰🇪 Proudly Kenyan</span>
          </div>
        </div>
        <div>
          <h3>Order</h3>
          <button onClick={() => navigate("shop")}>Browse menu</button>
          <button onClick={() => setLocationOpen(true)}>Set delivery location</button>
          <button onClick={() => setProfileOpen(true)}>My profile and orders</button>
          <a href={quickWhatsapp} target="_blank" rel="noreferrer">WhatsApp ordering</a>
        </div>
        <div>
          <h3>Help & Information</h3>
          <button onClick={() => navigate("privacy")}>Privacy Policy</button>
          <button onClick={() => navigate("terms")}>Terms, Refunds & Cancellations</button>
          <p>Our food is prepared in a kitchen that handles allergens. Please inform us of severe allergies before ordering.</p>
        </div>
        <div>
          <h3>Contact</h3>
          <a href={`tel:+${PHONE}`}>+254 792 211 741</a>
          <a href={quickWhatsapp} target="_blank" rel="noreferrer">Message on WhatsApp</a>
          <p>Delivery fees, availability and timing are confirmed before fulfilment.</p>
        </div>
        
        {/* BOTTOM COPYRIGHT BAR */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Savorly Eats. All rights reserved.</p>
          <p>This site is protected by Bizwaziri Technologies and the Google Privacy Policy and Terms of Service apply.</p>
        </div>
      </footer>

               {/* FLOATING WHATSAPP BUTTON - ALWAYS VISIBLE */}
      <a 
        href={quickWhatsapp} 
        target="_blank" 
        rel="noreferrer" 
        className="floating-whatsapp"
        aria-label="Chat on WhatsApp"
      >
        <Icon name="whatsapp" size={28} />
        <span className="whatsapp-tooltip">Need help? Chat with us</span>
      </a>

      {/* MOBILE CART BAR - Only shows if cart has items */}
      {count > 0 && view === "shop" && (
        <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <b>{count}</b>
          <span>View cart</span>
          <strong>{money(totals.grand)}</strong>
        </button>
      )}


           <AnimatePresence>
        {cartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drawer-wrap" 
            onMouseDown={() => setCartOpen(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="cart-drawer"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="drawer-title">
                <div>
                  <p className="eyebrow">YOUR CART</p>
                  <h2>
                    {count
                      ? `${count} item${count === 1 ? "" : "s"}`
                      : "Your cart is empty"}
                  </h2>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  aria-label="Close cart"
                >
                  <Icon name="close" />
                </button>
              </div>
              
              {cart.length ? (
                <>
                  <div className="cart-lines">
                    {cart.map((l) => (
                      <div className="cart-line" key={l.key}>
                        <img src={l.product.image} alt="" />
                        <div>
                          <h3>{l.product.name}</h3>
                          <p>{l.variant.label}</p>
                          <strong>{money(l.variant.price * l.quantity)}</strong>
                          {l.variant.packagingRequired && (
                            <small>
                              Packaging:{" "}
                              {money(
                                l.variant.packagingFee *
                                  l.variant.packagingQuantity *
                                  l.quantity,
                              )}
                            </small>
                          )}
                        </div>
                        <div className="quantity">
                          <button
                            onClick={() => update(l.key, l.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Icon name="minus" size={16} />
                          </button>
                          <span>{l.quantity}</span>
                          <button
                            onClick={() => update(l.key, l.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Icon name="plus" size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="zone-cart"
                    onClick={() => setLocationOpen(true)}
                  >
                    <Icon name="pin" />
                    <span>
                      <small>Delivering to</small>
                      <strong>{zone?.name || "Choose a delivery zone"}</strong>
                    </span>
                    <b>{zone ? money(zone.fee) : "Select"}</b>
                  </button>
                  <div className="promo">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Promo code"
                    />
                    <button onClick={applyPromo}>Apply</button>
                  </div>




                                    {/* SMART RECOMMENDATIONS */}
                  {recommendedProducts.length > 0 && (
                    <div style={{ marginTop: "20px", borderTop: "1px dashed var(--line)", paddingTop: "15px" }}>
                      <p className="eyebrow" style={{ marginBottom: "10px" }}>COMPLETE YOUR MEAL</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {recommendedProducts.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--paper)", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img src={p.image} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                              <div>
                                <strong style={{ fontSize: "12px", display: "block", color: "var(--ink)" }}>{p.name}</strong>
                                <small style={{ fontSize: "10px", color: "var(--muted)" }}>+ {money(p.variants[0].price)}</small>
                              </div>
                            </div>
                            <button 
                              onClick={() => add(p, p.variants[0])}
                              style={{ background: "var(--green)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "grid", placeItems: "center", cursor: "pointer" }}
                            >
                              <Icon name="plus" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  



                  {/* I added zone={zone} here so the FREE delivery upsell works */}
                                    <Summary totals={totals} zone={zone} promo={promo} />
                  
                  <p className="fee-note">
                    All configured delivery and packaging fees are included above.
                    No account required.
                  </p>
                  <button
                    className="primary wide"
                    onClick={() => navigate("checkout")}
                    disabled={!zone?.available}
                  >
                    Checkout · {money(totals.grand)}
                  </button>
                  <button className="continue" onClick={() => setCartOpen(false)}>
                    Continue shopping
                  </button>
                </>
              ) : (
                <div className="empty">
                  <Icon name="bag" size={34} />
                  <p>Add something worth craving.</p>
                  <button className="primary" onClick={() => setCartOpen(false)}>
                    Browse menu
                  </button>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      {profileOpen && (
        <div className="drawer-wrap" onMouseDown={() => setProfileOpen(false)}>
          <aside
            className="profile-drawer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-title">
              <div>
                <p className="eyebrow">MY SAVORLY</p>
                <h2>{profile.name || "Your profile"}</h2>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                aria-label="Close profile"
              >
                <Icon name="close" />
              </button>
            </div>
            {profile.name ? (
              <>
                <div className="profile-contact">
                  <span>
                    <Icon name="user" />
                  </span>
                  <div>
                    <strong>{profile.name}</strong>
                    <small>
                      {profile.phone}
                      <br />
                      {profile.address}
                    </small>
                  </div>
                </div>
                <div className="profile-stats">
                  <div>
                    <strong>{orderHistory.length}</strong>
                    <span>Orders on this device</span>
                  </div>
                  <div>
                    <strong>{money(historyStats.total)}</strong>
                    <span>All submitted value</span>
                  </div>
                  <div>
                    <strong>{money(historyStats.week)}</strong>
                    <span>Last 7 days</span>
                  </div>
                  <div>
                    <strong>{money(historyStats.month)}</strong>
                    <span>Last 30 days</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="profile-empty">
                <Icon name="user" size={30} />
                <h3>Your details will appear here</h3>
                <p>
                  Complete your first checkout and Savorly will autofill your
                  next order.
                </p>
              </div>
            )}
            <div className="history-head">
              <h3>Recent orders</h3>
              <Icon name="history" />
            </div>
            <div className="order-history">
              {orderHistory.length ? (
                orderHistory.map((order) => (
                  <article key={order.orderId}>
                    <div>
                      <small>
                        {order.orderDate} · {order.orderStatus}
                      </small>
                      <h4>
                        {order.items
                          .map((item) => item.productName)
                          .slice(0, 2)
                          .join(", ")}
                      </h4>
                      <strong>{money(order.financials.grand)}</strong>
                    </div>
                    <button
                      onClick={() => {
                        reorder(order);
                        setProfileOpen(false);
                      }}
                    >
                      Order again
                    </button>
                  </article>
                ))
              ) : (
                <p>No saved orders yet.</p>
              )}
            </div>
            <p className="profile-note">
              This profile is saved only in this browser. Submitted totals are
              not confirmed completed spending.
            </p>
          </aside>
        </div>
      )}
      {locationOpen && (
        <LocationSelector
          zone={zone}
          pin={pin}
          select={setZone}
          setPin={setPin}
          close={() => setLocationOpen(false)}
        />
      )}


      {isScheduleOpen && (
        <ScheduleModal 
          close={() => setIsScheduleOpen(false)}
          bookingType={bookingType} setBookingType={setBookingType}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          selectedTime={selectedTime} setSelectedTime={setSelectedTime}
        />
      )}



      {selected && (
        <ProductModal
          product={selected}
          add={(v, spice) => add(selected, v, spice)}
          close={() => setSelected(null)}
        />
      )}
      {feedbackOpen && (
        <Modal title="Rate Savorly" close={() => setFeedbackOpen(false)}>
          <div className="modal-pad feedback">
            <p className="eyebrow">QUICK FEEDBACK</p>
            <h2>How was your ordering experience?</h2>
            <p>
              Your order is already on its way to WhatsApp. This rating is
              optional.
            </p>
            <div className="stars" aria-label="Choose a rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={rating >= star ? "selected" : ""}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                >
                  <Icon name="star" size={30} />
                </button>
              ))}
            </div>
            <label>
              Optional comment
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Tell us what felt easy or what we should improve"
              />
            </label>
            <button
              className="primary wide"
              disabled={!rating}
              onClick={sendFeedback}
            >
              Submit feedback
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}


function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(onComplete, 500);
      },
    });

    tl.fromTo(
      logoRef.current,
      { scale: 0.5, opacity: 0, rotation: -45 },
      { scale: 1, opacity: 1, rotation: 0, duration: 2.0, ease: "back.out(1.5)" }
    )
      .fromTo(
        textRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, ease: "power3.out" },
        "-=1.0"
      )
      .to({}, { duration: 2.0 })
      .fromTo(
        barRef.current,
        { width: "0%" },
        { width: "100%", duration: 3.0, ease: "power2.inOut" }
      )
      .to(containerRef.current, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="splash-container">
      <div ref={logoRef} className="splash-logo">
        S
      </div>

      <div ref={textRef} className="splash-text-group">
        <h1 className="splash-title">
          Savorly<span>.</span>
        </h1>
        <p className="splash-subtitle">Good food, whenever you crave it.</p>
      </div>

      <div className="splash-bar-bg">
        <div ref={barRef} className="splash-bar-fill" />
      </div>
    </div>
  );
}



function ScheduleModal({ 
  close, 
  bookingType, setBookingType, 
  selectedDay, setSelectedDay, 
  selectedTime, setSelectedTime 
}: { 
  close: () => void;
  bookingType: "delivery" | "collection"; setBookingType: (val: "delivery" | "collection") => void;
  selectedDay: string; setSelectedDay: (val: string) => void;
  selectedTime: string; setSelectedTime: (val: string) => void;
}) {
  const upcomingDays = getUpcomingDays();
  const availableTimes = getTimeSlots(selectedDay);

  // Auto-select the first available time if the current one isn't valid
  useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0]);
    }
  }, [selectedDay, availableTimes, selectedTime, setSelectedTime]);

  return (
    <Modal title="Schedule Delivery" close={close}>
      <div className="modal-pad" style={{ padding: "40px 30px" }}>
        <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "0.15em", fontWeight: 700 }}>
          LIVE SCHEDULING
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", color: "var(--green)", marginTop: "8px", marginBottom: "8px" }}>
          When would you like it?
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "30px", lineHeight: "1.6" }}>
          We cook to order. These times are generated live based on your current time.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", background: "var(--soft)", padding: "4px", borderRadius: "999px", marginBottom: "30px", border: "1px solid var(--line)" }}>
          <button 
            onClick={() => setBookingType("collection")}
            style={{ flex: 1, padding: "12px", borderRadius: "999px", background: bookingType === "collection" ? "white" : "transparent", color: bookingType === "collection" ? "var(--green)" : "var(--muted)", fontWeight: 600, fontSize: "12px", boxShadow: bookingType === "collection" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
          >
            Collect in Store
          </button>
          <button 
            onClick={() => setBookingType("delivery")}
            style={{ flex: 1, padding: "12px", borderRadius: "999px", background: bookingType === "delivery" ? "white" : "transparent", color: bookingType === "delivery" ? "var(--green)" : "var(--muted)", fontWeight: 600, fontSize: "12px", boxShadow: bookingType === "delivery" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
          >
            Deliver to Me
          </button>
        </div>

        {/* Day Selector */}
        <p style={{ fontWeight: 700, fontSize: "12px", marginBottom: "12px", color: "var(--ink)" }}>Select Day</p>
        <div className="time-selector-grid" style={{ marginBottom: "25px" }}>
          {upcomingDays.map((d) => (
            <div key={d.dateStr} className={`time-slot ${selectedDay === d.dateStr ? "active" : ""}`} onClick={() => setSelectedDay(d.dateStr)}>
              <strong>{d.label}</strong>
              <small>{d.dayNum} {d.month}</small>
            </div>
          ))}
        </div>

        {/* Time Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <p style={{ fontWeight: 700, fontSize: "12px", color: "var(--ink)" }}>Select Time</p>
          <p style={{ fontSize: "10px", color: "var(--muted)" }}>30-min windows</p>
        </div>
        
        {availableTimes.length > 0 ? (
          <div className="time-selector-grid" style={{ marginBottom: "30px" }}>
            {availableTimes.map((time) => (
              <div key={time} className={`time-slot ${selectedTime === time ? "active" : ""}`} onClick={() => setSelectedTime(time)}>
                <strong>{time}</strong>
                <small>Available</small>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "20px", background: "var(--warn)", borderRadius: "8px", marginBottom: "30px", fontSize: "13px", color: "#644b00" }}>
            <strong>Kitchen is closed for today.</strong> Please select tomorrow or another day.
          </div>
        )}

        <button className="primary wide" onClick={close} style={{ padding: "16px" }}>
          Confirm {selectedTime ? `${selectedTime} on ${selectedDay}` : "Time"}
        </button>
      </div>
    </Modal>
  );
}



// Helper to generate real upcoming days
function getUpcomingDays() {
  const days = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    
    let label = dayNames[d.getDay()];
    if (i === 0) label = "Today";
    if (i === 1) label = "Tomorrow";

    days.push({
      label,
      dateStr: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      month: d.toLocaleString('default', { month: 'short' })
    });
  }
  return days;
}

// Helper to generate real time slots (from 10:00 AM to 9:00 PM)
function getTimeSlots(selectedDayStr: string) {
  const slots = [];
  const now = new Date();
  const isToday = selectedDayStr === now.toISOString().split('T')[0];
  
  // Kitchen hours: 10:00 to 21:00
  for (let hour = 10; hour <= 21; hour++) {
    for (let min of [0, 30]) {
      if (hour === 21 && min === 30) continue; // Stop at 21:00

      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      // If it's today, hide times that have already passed (add 45 mins prep time)
      if (isToday) {
        const slotTime = new Date();
        slotTime.setHours(hour, min, 0, 0);
        const cutoff = new Date(now.getTime() + 45 * 60000); // 45 mins from now
        
        if (slotTime < cutoff) continue; 
      }

      slots.push(timeString);
    }
  }
  return slots;
}