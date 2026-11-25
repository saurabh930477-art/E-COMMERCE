# E-COMMERCE — Commonplace Goods storefront

A responsive e-commerce storefront built with React and Vite.

## Run locally

1. Install dependencies with `npm install`.
2. Start the frontend and API with `npm run dev`.
3. Open the store at `http://localhost:5173/`.

Build the production frontend with `npm run build`.

## Deploy a demo to Render

1. Push the project to GitHub.
2. In Render, choose **New → Blueprint**, select this repository, and create the service from `render.yaml`.
3. Open the public URL Render provides after the deployment finishes.

The free service is for demos: its filesystem is temporary, so SQLite accounts and reviews may reset after a restart or redeploy. Password reset is unavailable in production until an email provider is configured.

## Storefront features

- Responsive product catalog with category filters, search, and price sorting.
- Search matches the local catalog and offers a link to live Flipkart search results. Importing Flipkart products into this storefront requires an official product feed/API.
- Product detail views, quantity controls, and a shopping bag saved in browser local storage.
- Product ratings and written reviews stored in SQLite; signed-in customers can submit or update one review per product.
- Seller analytics summarizing demo order sales, volume, average order value, and top products from the 20 most recent orders on the current browser.
- Store information section explains the delivery threshold, demo checkout limits, and review requirements.
- Offline product assistant recommends products from the local catalog without an external AI service or API key.
- Indian rupee pricing, a free-shipping threshold, and cart totals formatted for India.
- Checkout validates an Indian mobile number, state, and PIN code before saving the demo order locally.
- Demo checkout uses pay-on-delivery and does not collect or process payment details.
- Signup and sign-in use server-side password hashing and secure session cookies.
- Signed-in customers can review and update their profile name and email address.
- Forgot-password recovery is a local-development demo: it creates a hashed, one-time reset token valid for 15 minutes. No email is sent, and reset endpoints return an explicit unavailable error in production until an email provider is configured.
- Account data is stored in the local SQLite database at `data/commonplace.sqlite`, created on first server start.
- Product catalog and storefront styling live in `src/Shop.jsx` and `src/shop.css`.
- The storefront entry points are `index.html` and `shop.html`, both using `src/shop-main.jsx`.
