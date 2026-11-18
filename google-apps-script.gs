const SHEET_ID = "YOUR_SPREADSHEET_ID";

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    if (e.parameter.action !== "getMenu") return json({ error: "Unknown action" });
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Menu");
    if (!sheet) return json({ error: "Menu sheet not found" });
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return json([]);
    const headers = data[0];
    const rows = data.slice(1).map((row) => {
      const item = {};
      headers.forEach((header, index) => item[header] = row[index]);
      return item;
    });
    return json(rows.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
  } catch (error) {
    return json({ error: String(error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (data.type === "feedback") {
      const feedback = ss.getSheetByName("Feedback");
      feedback.appendRow([new Date(), data.orderId, data.rating, data.comment || ""]);
      return json({ status: "ok" });
    }

    if (data.type !== "order" || !data.orderId || !Array.isArray(data.items)) {
      return json({ status: "error", message: "Invalid order payload" });
    }

    const orders = ss.getSheetByName("Orders");
    const existing = orders.getRange(1, 1, Math.max(orders.getLastRow(), 1), 1)
      .getValues().flat().includes(data.orderId);
    if (existing) return json({ status: "duplicate", orderId: data.orderId });

    const pin = data.delivery.pin || {};
    orders.appendRow([
      data.orderId, new Date(), data.customer.name, data.customer.phone,
      data.customer.returning ? "Returning" : "New", data.customer.orderNumber,
      data.delivery.zone.name, data.delivery.fullAddress, pin.lat || "",
      pin.lng || "", pin.accuracy || "", data.financials.items,
      data.financials.packaging, data.financials.delivery,
      data.financials.discount, data.financials.grand,
      data.customer.paymentMethod, "Pending", JSON.stringify(data),
    ]);

    const items = ss.getSheetByName("OrderItems");
    data.items.forEach((item) => items.appendRow([
      data.orderId, item.productId, item.productName, item.category,
      item.variant, item.quantity, item.unitPrice, item.itemSubtotal,
      item.packagingRequired, item.packagingQuantity, item.packagingFee,
      item.packagingSubtotal,
    ]));

    return json({ status: "ok", orderId: data.orderId });
  } catch (error) {
    return json({ status: "error", message: String(error) });
  } finally {
    lock.releaseLock();
  }
}
