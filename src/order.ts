import type { DeliveryZone, Product, Variant } from "./data";


export type CartLine = { 
  key: string; 
  product: Product; 
  variant: Variant; 
  quantity: number; 
  spice?: string; // <-- ADDED THIS
};

export type Totals = { items: number; packaging: number; delivery: number; discount: number; grand: number };
export type CustomerDetails = { name: string; phone: string; address: string; deliveryTime: string; instructions: string; paymentMethod: string; marketingConsent: boolean };
export type GeoPin = { lat: number; lng: number; accuracy: number };
export type OrderPayload = {
  type: "order"; orderId: string; orderDate: string; orderTime: string; orderStatus: string; orderChannel: string;
  customer: CustomerDetails & { orderNumber: number; returning: boolean }; delivery: { zone: DeliveryZone; fullAddress: string; deliveryFee: number; pin: GeoPin | null };
  items: Array<Record<string, string | number | boolean>>; financials: Totals & { paymentStatus: string };
  operations: { supplier: string; preparationNotes: string; customerNotes: string; submissionTimestamp: string; confirmationStatus: string };
};

export const VALID_PROMOS: Record<string, { type: "percentage" | "fixed"; value: number; minSpend: number; label: string }> = {
  "SAVORLY10": { type: "percentage", value: 0.10, minSpend: 0, label: "10% off your order" },
  "WELCOME100": { type: "fixed", value: 100, minSpend: 500, label: "KSh 100 off (Min spend 500)" },
  "CHOMA200": { type: "fixed", value: 200, minSpend: 1000, label: "KSh 200 off (Min spend 1000)" },
  "FREEDEL": { type: "fixed", value: 150, minSpend: 0, label: "Free delivery (Up to KSh 150)" },
};

export const calculateTotals = (cart: CartLine[], zone: DeliveryZone | null, promo: string): Totals => {
  const items = cart.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
  const packaging = 0;
  
  let delivery = 0;
  if (zone?.available) {
    if (zone.freeAbove && items >= zone.freeAbove) {
      delivery = 0;
    } else {
      delivery = zone.fee;
    }
  }

  // NEW PROMO LOGIC
  let discount = 0;
  const code = promo.trim().toUpperCase();
  const promoData = VALID_PROMOS[code];

  if (promoData && items >= promoData.minSpend) {
    if (promoData.type === "percentage") {
      discount = Math.round(items * promoData.value);
    } else {
      // If it's a fixed amount, don't let it exceed the delivery fee if it's FREEDEL
      if (code === "FREEDEL") {
        discount = Math.min(delivery, promoData.value);
        delivery = 0; // Waive the delivery fee
      } else {
        discount = promoData.value;
      }
    }
  }

  return { items, packaging, delivery, discount, grand: Math.max(0, items + packaging + delivery - discount) };
};

export const makeOrderId = () => `SAV-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const createPayload = (orderId: string, cart: CartLine[], zone: DeliveryZone, customer: CustomerDetails, totals: Totals, pin: GeoPin | null, orderNumber: number): OrderPayload => {
  const now = new Date();
  return {
    type: "order", orderId, orderDate: now.toLocaleDateString("en-KE"), orderTime: now.toLocaleTimeString("en-KE"), orderStatus: "Awaiting confirmation", orderChannel: "WhatsApp",
    customer: { ...customer, orderNumber, returning: orderNumber > 1 }, delivery: { zone, fullAddress: customer.address, deliveryFee: totals.delivery, pin },
       items: cart.map((line) => ({
      productName: line.product.name, productId: line.product.id, category: line.product.category, variant: line.variant.label,
      quantity: line.quantity, unitPrice: line.variant.price, itemSubtotal: line.variant.price * line.quantity,
      spice: line.spice || "None", // <-- ADDED
      packagingRequired: line.variant.packagingRequired, packagingQuantity: line.variant.packagingQuantity * line.quantity,
      packagingFee: line.variant.packagingFee, packagingSubtotal: line.variant.packagingFee * line.variant.packagingQuantity * line.quantity,
    })),
    financials: { ...totals, paymentStatus: "Unpaid" },
    operations: { supplier: [...new Set(cart.map((line) => line.product.supplier))].join(", "), preparationNotes: "", customerNotes: customer.instructions, submissionTimestamp: now.toISOString(), confirmationStatus: "Awaiting business confirmation" },
  };
};


export const whatsappMessage = (payload: OrderPayload, tip: number = 0) => {
   const itemLines = payload.items.map((item) => {
    const spice = item.spice ? ` [Spice: ${item.spice}]` : "";
    return `- ${item.quantity} x ${item.productName} (${item.variant})${spice} - KSh ${Number(item.itemSubtotal).toLocaleString()}`;
  }).join("\n");

  
    
  const pin = payload.delivery.pin;
  const payment = payload.customer.paymentMethod;
  
  let paymentInstruction = "";
  if (payment === "Till Number (Pay now)") {
    paymentInstruction = `\n\n⚠️ ACTION REQUIRED: Pay to M-PESA Buy Goods Till: 1658917\nOnce paid, reply to this message with the M-PESA confirmation code.`;
  } else {
    paymentInstruction = `\n\nYou have selected Cash on Delivery. Please have KSh ${(payload.financials.grand + tip).toLocaleString()} ready.`;
  }

  return [
    `NEW SAVORLY ORDER - ${payload.orderId}`, "", "CUSTOMER",
    `Name: ${payload.customer.name}`, `Phone: ${payload.customer.phone}`,
    `${payload.customer.returning ? `Returning customer - order number ${payload.customer.orderNumber}` : "New customer - first order"}`,
    "", "DELIVERY ADDRESS", `${payload.delivery.zone.name} - ${payload.delivery.fullAddress}`,
    pin ? `GPS pin: https://maps.google.com/?q=${pin.lat},${pin.lng}` : "GPS pin: Not provided",
    pin ? `Reported GPS accuracy: approximately ${Math.round(pin.accuracy)} m` : "",
    `Delivery fee: KSh ${payload.financials.delivery.toLocaleString()}`, `Preferred time: ${payload.customer.deliveryTime}`,
    "", "ITEMS", itemLines, "", "TOTAL",
    `Subtotal: KSh ${payload.financials.items.toLocaleString()}`, `Packaging: KSh ${payload.financials.packaging.toLocaleString()}`,
    `Delivery: KSh ${payload.financials.delivery.toLocaleString()}`, `Discount: KSh ${payload.financials.discount.toLocaleString()}`,
    `Estimated total: KSh ${payload.financials.grand.toLocaleString()}`,
    tip > 0 ? `Rider Tip: KSh ${tip.toLocaleString()} (Please give to rider)` : "",
    tip > 0 ? `TOTAL TO COLLECT: KSh ${(payload.financials.grand + tip).toLocaleString()}` : "",
    "", "PAYMENT",
    `Method: ${payment}`,
    paymentInstruction,
    "", "NOTES",
    `${payload.customer.instructions || "None"}`, "", "Please confirm availability, final total and timing.",
  ].join("\n");
};

export const submitToSheets = async (payload: OrderPayload): Promise<"submitted" | "not-configured"> => {
  const endpoint = import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT;
  if (!endpoint) return "not-configured";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Order logging failed");
  const result = await response.json().catch(() => null);
  if (result?.status && !["ok", "duplicate"].includes(result.status)) throw new Error(result.message || "Order logging failed");
  return "submitted";
};

export const submitFeedback = async (orderId: string, rating: number, comment: string) => {
  const endpoint = import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT;
  if (!endpoint) return "not-configured" as const;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type: "feedback", orderId, rating, comment }),
  });
  if (!response.ok) throw new Error("Feedback could not be saved");
  const result = await response.json().catch(() => null);
  if (result?.status && result.status !== "ok") throw new Error(result.message || "Feedback could not be saved");
  return "submitted" as const;
};
