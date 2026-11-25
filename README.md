# Commonplace Goods storefront

A responsive e-commerce storefront built with React and Vite.

## Run locally

1. Install dependencies with `npm install`.
2. Start the frontend and API with `npm run dev`.
3. Open the store at `http://localhost:5173/`.

Build the production frontend with `npm run build`.

## Storefront features

- Responsive product catalog with category filters, search, and price sorting.
- Search matches the local catalog and offers a link to live Flipkart search results. Importing Flipkart products into this storefront requires an official product feed/API.
- Product detail views, quantity controls, and a shopping bag saved in browser local storage.
- Product ratings and written reviews stored in SQLite; signed-in customers can submit or update one review per product.
- Seller analytics summarizing demo order sales, volume, average order value, and top products from the 20 most recent orders on the current browser.
- Indian rupee pricing, a free-shipping threshold, and cart totals formatted for India.
- Checkout validates an Indian mobile number, state, and PIN code before saving the demo order locally.
- Demo checkout uses pay-on-delivery and does not collect or process payment details.
- Signup and sign-in use server-side password hashing and secure session cookies.
- Account data is stored in the local SQLite database at `data/commonplace.sqlite`, created on first server start.
- Product catalog and storefront styling live in `src/Shop.jsx` and `src/shop.css`.
- The storefront entry points are `index.html` and `shop.html`, both using `src/shop-main.jsx`.
