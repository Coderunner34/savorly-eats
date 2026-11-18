# Savorly Google Sheets setup

Savorly works without a Sheets endpoint and sends orders to WhatsApp. To manage the menu and log orders/feedback from Sheets, deploy the included `google-apps-script.gs` as a Google Apps Script Web App.

## 1. Create the spreadsheet

Create these tabs with the exact names:

### Menu

`productId | name | description | category | price | portion | imageUrl | available | featured | packagingRequired | packagingFee | packagingQuantity | supplier | variants | sortOrder`

- Supported categories: `Snacks`, `Drinks`, `Meals`, `Fresh Cuts`, `Marinated`, `Family Packs`.
- `available` and `featured` use `TRUE` or `FALSE`.
- For one-size products, use `price` and `portion`.
- For variants, place JSON in `variants`, for example:

```json
[{"id":"500g","label":"500 g","price":520,"packagingRequired":false,"packagingFee":0,"packagingQuantity":0},{"id":"1kg","label":"1 kg","price":980,"packagingRequired":false,"packagingFee":0,"packagingQuantity":0}]
```

Changing a Menu row updates the deployed storefront on its next load. If the endpoint is unavailable, Savorly keeps the bundled fallback menu and shows a warning.

### Orders

`orderId | createdAt | customerName | customerPhone | customerType | orderNumber | deliveryZone | address | latitude | longitude | accuracy | itemsSubtotal | packaging | deliveryFee | discount | grandTotal | paymentMethod | status | payload`

### OrderItems

`orderId | productId | productName | category | variant | quantity | unitPrice | itemSubtotal | packagingRequired | packagingQuantity | packagingFee | packagingSubtotal`

### Feedback

`createdAt | orderId | rating | comment`

## 2. Deploy Apps Script

1. Open **Extensions → Apps Script** from the spreadsheet.
2. Copy `google-apps-script.gs` into the editor.
3. Replace `YOUR_SPREADSHEET_ID` with the ID between `/d/` and `/edit` in the Sheet URL.
4. Select **Deploy → New deployment → Web app**.
5. Execute as the spreadsheet owner.
6. Choose the access level appropriate for your operation. The storefront needs to call the endpoint without a Google login.
7. Copy the deployed URL ending in `/exec`.

## 3. Configure Vercel or Netlify

Copy `.env.example` to `.env.local` for local work. In hosting settings add:

```text
VITE_GOOGLE_SHEETS_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Redeploy after changing environment variables. Never place service-account credentials, passwords, private API keys or a private spreadsheet URL in frontend source.

## Location and Maps

The current frontend uses browser high-accuracy geolocation and a Google Maps embed/link. This requires HTTPS and explicit customer permission. Device GPS accuracy varies, so Savorly displays the browser-reported accuracy and lets the customer verify the map.

For Places address autocomplete or a draggable Google Maps JavaScript marker, create a Google Cloud browser key, enable the required Maps/Places APIs, restrict the key to your deployed domains, and add it as `VITE_GOOGLE_MAPS_API_KEY`. Those paid Google services are intentionally not activated or simulated by this frontend.

## Important limitations

- Browser profiles and order history are stored only on that device and are not accounts.
- Clearing browser storage removes saved profile/history.
- Submitted order value is not the same as confirmed completed spending.
- Sheets is suitable for a modest first operation but is not a secure authenticated customer-account database.
- Do not expose Orders, Customers or precise location history through a public `doGet` action.
