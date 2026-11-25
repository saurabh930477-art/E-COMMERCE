import { useEffect, useMemo, useRef, useState } from 'react';
import './shop.css';

const products = [
  { id: 'moss-speaker', name: 'Moss wireless speaker', category: 'Tech', price: 7499, oldPrice: 8999, badge: 'WIRELESS AUDIO', color: 'sage', image: 'photo-1608043152269-423dbba4e7e1', description: 'Room-filling sound, wrapped in a soft-touch finish. Enjoy up to 18 hours of listening and a little more calm in your everyday.' },
  { id: 'studio-lamp', name: 'Studio table lamp', category: 'Home', price: 9999, badge: 'ADJUSTABLE LIGHT', color: 'sand', image: 'photo-1507473885765-e6ed057f782c', description: 'A warm, adjustable glow for slow mornings and late-night ideas. Crafted from powder-coated steel with a weighted base.' },
  { id: 'weekender', name: 'The weekender bag', category: 'Travel', price: 12499, badge: 'TRAVEL ESSENTIAL', color: 'clay', image: 'photo-1553062407-98eeb64c6a62', description: 'A thoughtfully organized carryall for the long weekend. Recycled water-resistant canvas, sturdy handles, and room for one more thing.' },
  { id: 'ceramic-set', name: 'Everyday ceramic set', category: 'Home', price: 3499, color: 'cream', image: 'photo-1493106641515-6b5631de4bb9', description: 'Four hand-finished cups with an easy-to-hold shape and a quietly beautiful glaze. Made for your daily cup, not the cupboard.' },
  { id: 'headphones', name: 'Quiet hours headphones', category: 'Tech', price: 14999, oldPrice: 17499, badge: 'OVER-EAR AUDIO', color: 'blue', image: 'photo-1505740420928-5e560c06d30e', description: 'Comfort-first over-ear headphones with warm, detailed sound and a long-lasting battery for commutes, focus, and everything in between.' },
  { id: 'daily-bottle', name: 'Daily carry bottle', category: 'Travel', price: 1299, color: 'blue', image: 'photo-1602143407151-7111542de6e8', description: 'A double-wall stainless steel bottle that keeps your drink just right. Leakproof, lightweight, and made to be carried everywhere.' },
  { id: 'linen-throw', name: 'Cloud-soft linen throw', category: 'Home', price: 6999, badge: 'LINEN TEXTURE', color: 'sand', image: 'photo-1600210492486-724fe5c67fb0', description: 'A relaxed, breathable layer woven from European flax. Gets softer with every wash and looks at home wherever you drape it.' },
  { id: 'daily-journal', name: 'The daily journal', category: 'Wellness', price: 699, color: 'clay', image: 'photo-1517842645767-c639042777db', description: 'A little room to think. This undated linen-bound journal has 192 recycled-paper pages and a lay-flat binding.' },
];

const categories = ['Everything', 'Home', 'Tech', 'Travel', 'Wellness'];
const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
const freeShippingThreshold = 2500;
const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('commonplace-cart') || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) =>
      products.some((product) => product.id === id) && Number.isInteger(quantity) && quantity > 0 && quantity < 100));
  } catch (error) {
    console.error('Could not read the saved cart.', error);
    return {};
  }
}

function readOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem('commonplace-orders') || '[]');
    if (!Array.isArray(saved)) throw new TypeError('Saved orders must be a list.');
    return saved.filter((order) => order && typeof order.id === 'string'
      && Number.isFinite(order.total) && Array.isArray(order.items));
  } catch (error) {
    console.error('Could not read saved orders for seller analytics.', error);
    return [];
  }
}

function ProductCard({ product, addToCart, openProduct }) {
  return (
    <article className="product-card">
      <button className={`product-image ${product.color}`} onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
        <img src={imageUrl(product.image)} alt={product.name} loading="lazy" />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <span className="quick-view">Quick view <Icon name="arrow" size={15} /></span>
      </button>
      <div className="product-meta">
        <div><p className="product-category">{product.category}</p><button className="product-name" onClick={() => openProduct(product)}>{product.name}</button></div>
        <div className="product-price">{product.oldPrice && <s>{money(product.oldPrice)}</s>}{money(product.price)}</div>
      </div>
      <div className="product-card-bottom">
        <button className="add-button" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}><Icon name="plus" size={18} /></button>
      </div>
    </article>
  );
}

function Overlay({ children, onClose, className = '' }) {
  return <div className={`overlay ${className}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="overlay-panel">{children}</div></div>;
}

function ProductReviews({ product, account, onSignIn }) {
  const [summary, setSummary] = useState({ averageRating: 0, reviewCount: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rating, setRating] = useState('5');
  const [body, setBody] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const roundedRating = Math.round(summary.averageRating);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setReviews([]);
    setSummary({ averageRating: 0, reviewCount: 0 });
    apiRequest(`/api/products/${encodeURIComponent(product.id)}/reviews`)
      .then((data) => {
        if (!active) return;
        setSummary(data.summary);
        setReviews(data.reviews);
        const ownReview = data.reviews.find((review) => review.isOwn);
        setRating(ownReview ? String(ownReview.rating) : '5');
        setBody(ownReview ? ownReview.body : '');
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product.id, refreshKey]);

  async function submitReview(event) {
    event.preventDefault();
    setBusy(true);
    setFormMessage('');
    setFormError('');
    try {
      await apiRequest(`/api/products/${encodeURIComponent(product.id)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: Number(rating), body }),
      });
      setBody('');
      setFormMessage('Your review has been saved.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-heading">
      <div className="review-heading">
        <div><p className="eyebrow">CUSTOMER NOTES</p><h3 id="product-reviews-heading">Reviews</h3></div>
        <div className="review-summary">
        <span className="review-stars" aria-label={`${summary.averageRating} out of 5 stars`}>{'★'.repeat(roundedRating)}{'☆'.repeat(5 - roundedRating)}</span>
          <b>{summary.reviewCount ? summary.averageRating.toFixed(1) : '—'}</b>
          <span>({summary.reviewCount})</span>
        </div>
      </div>
      {loading ? <p className="review-feedback">Loading reviews…</p> : loadError ? <p className="review-error" role="alert">{loadError}</p> : reviews.length
        ? <ul className="review-list">{reviews.map((review) => {
          const date = new Date(`${review.createdAt.replace(' ', 'T')}Z`);
          const dateLabel = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
          return <li className="review-item" key={review.id}>
            <div className="review-item-heading"><b>{review.name}</b><span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
            <p>{review.body}</p>
            {dateLabel && <time dateTime={date.toISOString()}>{dateLabel}</time>}
          </li>;
        })}</ul>
        : <p className="review-feedback">No reviews yet. Be the first to share your thoughts.</p>}

      {account ? <form className="review-form" onSubmit={submitReview}>
        <h4>Share your experience</h4>
        <label>Rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="5">5 — Loved it</option><option value="4">4 — Really good</option><option value="3">3 — It’s okay</option><option value="2">2 — Not for me</option><option value="1">1 — Disappointed</option></select></label>
        <label>Your review<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength="3" maxLength="1000" required placeholder="What should others know about this item?" /></label>
        {formError && <p className="review-error" role="alert">{formError}</p>}
        {formMessage && <p className="review-success" role="status">{formMessage}</p>}
        <button className="dark-button" type="submit" disabled={busy}>{busy ? 'Saving…' : reviews.some((review) => review.isOwn) ? 'Update your review' : 'Submit review'} <Icon name="arrow" size={17} /></button>
      </form> : <div className="review-signin"><p>Sign in to share a review.</p><button className="dark-button" type="button" onClick={onSignIn}>Sign in to review <Icon name="arrow" size={17} /></button></div>}
    </section>
  );
}

function SellerAnalytics({ orders }) {
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const itemsSold = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) =>
    item && Number.isInteger(item.quantity) && item.quantity > 0 ? itemSum + item.quantity : itemSum, 0), 0);
  const productTotals = new Map();
  orders.forEach((order) => order.items.forEach((item) => {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string'
      || !Number.isInteger(item.quantity) || item.quantity < 1) return;
    const current = productTotals.get(item.id) || { id: item.id, name: item.name, quantity: 0 };
    current.quantity += item.quantity;
    productTotals.set(item.id, current);
  }));
  const bestSellers = [...productTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const highestQuantity = bestSellers[0]?.quantity || 1;

  return (
    <section className="seller-analytics" id="seller">
      <div className="section-heading">
        <div><p className="eyebrow">SELLER OVERVIEW</p><h2>Sales, <em>at a glance.</em></h2></div>
        <p>Understand what’s moving and how your shop is doing.</p>
      </div>
      <div className="seller-stats">
        <article><span>Total sales</span><b>{money(revenue)}</b></article>
        <article><span>Orders</span><b>{orders.length}</b></article>
        <article><span>Items sold</span><b>{itemsSold}</b></article>
        <article><span>Average order</span><b>{money(orders.length ? revenue / orders.length : 0)}</b></article>
      </div>
      <div className="seller-top-products">
        <h3>Top products</h3>
        {bestSellers.length ? <ol>{bestSellers.map((product) => <li key={product.id}>
          <div><b>{product.name}</b><span>{product.quantity} {product.quantity === 1 ? 'item' : 'items'} sold</span></div>
          <div className="seller-bar" role="progressbar" aria-label={`${product.name} sales`} aria-valuemin="0" aria-valuemax={highestQuantity} aria-valuenow={product.quantity}><span style={{ width: `${product.quantity / highestQuantity * 100}%` }} /></div>
        </li>)}</ol> : <p className="seller-empty">No demo orders yet. Place a test order to see sales insights here.</p>}
      </div>
      <p className="seller-disclaimer">Demo analytics from the 20 most recent orders saved in this browser. Not connected to a live payment or order system.</p>
    </section>
  );
}

function getAssistantRecommendations(message, catalog) {
  const normalizedMessage = message.toLowerCase();
  const categoryKeywords = {
    Home: ['home', 'lamp', 'ceramic', 'linen', 'throw', 'room', 'decor'],
    Tech: ['tech', 'speaker', 'headphone', 'audio', 'electronic'],
    Travel: ['travel', 'bag', 'bottle', 'trip', 'commute'],
    Wellness: ['wellness', 'journal', 'self-care', 'selfcare', 'mindful', 'calm'],
  };
  const requestedCategory = Object.entries(categoryKeywords).find(([, keywords]) =>
    keywords.some((keyword) => normalizedMessage.includes(keyword)))?.[0];
  const budgetMatch = normalizedMessage.match(/(?:under|below|less than|within|budget(?: of)?|up to|max(?:imum)?(?: of)?)\s*(?:₹|rs\.?\s*)?([\d,.]+)\s*(k)?/i);
  const budget = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, '')) * (budgetMatch[2] ? 1000 : 1)
    : Infinity;
  const ignoredTerms = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'can', 'could', 'would', 'show', 'find', 'want', 'need', 'help', 'recommend', 'please', 'something', 'item', 'items', 'product', 'products', 'under', 'below', 'less', 'than', 'within', 'budget', 'price', 'around', 'about']);
  const terms = normalizedMessage
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2 && !ignoredTerms.has(term) && !/^\d/.test(term));

  const rankedProducts = catalog
    .filter((product) => (!requestedCategory || product.category === requestedCategory) && product.price <= budget)
    .map((product) => {
      const searchableText = `${product.name} ${product.category} ${product.badge || ''} ${product.description}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (searchableText.includes(term) ? 1 : 0), 0);
      return { product, score };
    })
    .sort((first, second) => second.score - first.score || first.product.price - second.product.price)
    .slice(0, 3)
    .map(({ product }) => product);

  if (!rankedProducts.length) {
    const categoryText = requestedCategory ? `${requestedCategory} items` : 'items';
    const budgetText = Number.isFinite(budget) ? ` under ${money(budget)}` : '';
    return {
      text: `I couldn't find ${categoryText}${budgetText} in this catalog. Try a different category or budget.`,
      products: [],
    };
  }

  const intro = Number.isFinite(budget)
    ? `Here are a few options under ${money(budget)}${requestedCategory ? ` in ${requestedCategory}` : ''}:`
    : requestedCategory
      ? `Here are a few ${requestedCategory} options from the collection:`
      : 'Here are a few options from the collection:';
  return { text: intro, products: rankedProducts };
}

function ShoppingAssistant({ catalog, onViewProduct, onAddToCart }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Hi! I can help you find something from our collection. Tell me what you are looking for or share a budget.',
    products: [],
  }]);
  const messageListRef = useRef(null);

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, open]);

  function sendMessage(text) {
    const question = text.trim();
    if (!question) return;
    const answer = getAssistantRecommendations(question, catalog);
    setMessages((current) => [
      ...current,
      { role: 'user', text: question, products: [] },
      { role: 'assistant', ...answer },
    ]);
    setDraft('');
  }

  return (
    <aside className="shopping-assistant" aria-label="Offline shopping assistant">
      {open && <section className="assistant-panel" id="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
        <header className="assistant-header">
          <div><p>COMMONPLACE</p><h2 id="assistant-title">Product finder</h2></div>
          <button type="button" className="assistant-close" aria-label="Close product finder" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button>
        </header>
        <div className="assistant-messages" ref={messageListRef} aria-live="polite">
          {messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${index}-${message.role}`}>
            <p>{message.text}</p>
            {message.products.length > 0 && <ul className="assistant-products">{message.products.map((product) => <li key={product.id}>
              <div><b>{product.name}</b><span>{money(product.price)}</span></div>
              <div className="assistant-product-actions">
                <button type="button" onClick={() => { onViewProduct(product); setOpen(false); }}>View details</button>
                <button type="button" onClick={() => onAddToCart(product)}>Add to bag</button>
              </div>
            </li>)}</ul>}
          </div>)}
          {messages.length === 1 && <div className="assistant-prompts" aria-label="Suggested questions">
            {['Travel essentials under ₹2,500', 'Help me choose something for home', 'Show me Tech products'].map((prompt) =>
              <button type="button" key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>)}
          </div>}
        </div>
        <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); sendMessage(draft); }}>
          <label className="visually-hidden" htmlFor="assistant-question">Ask for a product recommendation</label>
          <input id="assistant-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="160" placeholder="What are you looking for?" />
          <button type="submit" disabled={!draft.trim()} aria-label="Send message"><Icon name="arrow" size={17} /></button>
        </form>
        <p className="assistant-disclaimer">Offline product helper · Recommendations use this store’s catalog.</p>
      </section>}
      <button type="button" className={`assistant-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={open ? 'assistant-panel' : undefined} onClick={() => setOpen((current) => !current)}>
        <Icon name={open ? 'close' : 'chat'} size={19} /><span>{open ? 'Close' : 'Ask for a product'}</span>
      </button>
    </aside>
  );
}

function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get('resetToken') || '';
  const [cart, setCart] = useState(readCart);
  const [sellerOrders, setSellerOrders] = useState(readOrders);
  const [category, setCategory] = useState('Everything');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [notice, setNotice] = useState('');
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(Boolean(initialResetToken));
  const [authMode, setAuthMode] = useState(initialResetToken ? 'reset' : 'login');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [resetLink, setResetLink] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/api/auth/me')
      .then(({ user }) => {
        if (active) setAccount(user);
      })
      .catch((error) => {
        if (active) setAuthMessage(error.message);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('commonplace-cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Could not save the cart on this device.', error);
      setNotice('Your browser could not save the cart. Keep this tab open while you shop.');
    }
  }, [cart]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) =>
      (category === 'Everything' || product.category === category)
      && (!normalizedQuery || `${product.name} ${product.category} ${product.badge || ''} ${product.description}`.toLowerCase().includes(normalizedQuery)));
    if (sortBy === 'price-low') return filtered.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') return filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [category, query, sortBy]);

  const cartItems = products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] }));
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : 99;

  function addToCart(product) {
    setCart((current) => ({ ...current, [product.id]: Math.min((current[product.id] || 0) + 1, 99) }));
    setNotice(`${product.name} added to your bag`);
  }

  function changeQuantity(id, amount) {
    setCart((current) => {
      const quantity = (current[id] || 0) + amount;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: Math.min(quantity, 99) };
    });
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const path = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const { user } = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') || '').trim(),
          email: String(form.get('email') || '').trim(),
          password: String(form.get('password') || ''),
          role: 'Rider',
          remember: true,
          termsAccepted: form.get('termsAccepted') === 'on',
        }),
      });
      setAccount(user);
      setAccountOpen(false);
      setNotice(authMode === 'signup' ? 'Your account is ready. Welcome!' : `Welcome back, ${user.name.split(' ')[0]}.`);
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function returnToSignIn() {
    const url = new URL(window.location.href);
    url.searchParams.delete('resetToken');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setResetToken('');
    setResetLink('');
    setAuthMode('login');
    setAuthMessage('');
  }

  async function submitForgotPassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const { resetToken: token } = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: String(form.get('email') || '').trim() }),
      });
      setResetToken(token);
      const url = new URL(window.location.href);
      url.searchParams.set('resetToken', token);
      setResetLink(url.toString());
      setAuthMode('reset-link');
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (password !== String(form.get('confirmPassword') || '')) {
      setAuthMessage('The passwords do not match.');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('');
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password }),
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('resetToken');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      setResetToken('');
      setAccount(null);
      setAccountOpen(false);
      setAuthMode('login');
      setNotice('Password reset. Sign in with your new password.');
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthBusy(true);
    setAuthMessage('');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setAccount(null);
      setAccountOpen(false);
      setNotice('You’ve been signed out.');
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const { user } = await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(form.get('name') || '').trim(),
          email: String(form.get('email') || '').trim(),
        }),
      });
      setAccount(user);
      setNotice('Your profile has been saved.');
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function placeOrder(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const savedOrder = {
      id: `CP-${Date.now().toString().slice(-8)}`,
      name: String(form.get('name')).trim(),
      email: String(form.get('email')).trim(),
      phone: String(form.get('phone')).trim(),
      address: `${String(form.get('address')).trim()}, ${String(form.get('city')).trim()}, ${String(form.get('state')).trim()} ${String(form.get('postal')).trim()}, India`,
      total: subtotal + shipping,
      items: cartItems.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
      placedAt: new Date().toISOString(),
    };
    try {
      const nextOrders = [savedOrder, ...readOrders()].slice(0, 20);
      localStorage.setItem('commonplace-orders', JSON.stringify(nextOrders));
      setSellerOrders(nextOrders);
    } catch (error) {
      console.error('Could not save the order on this device.', error);
      setNotice('Order placed, but this browser could not save the receipt.');
    }
    setOrder(savedOrder);
    setCart({});
    setCheckoutOpen(false);
    setCartOpen(false);
  }

  return (
    <div className="storefront">
      <a className="skip-link" href="#shop">Skip to products</a>
      <div className="announcement">Complimentary delivery on orders of {money(freeShippingThreshold)} or more <span>✳</span></div>
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Commonplace home">commonplace<span>.</span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#shop">Shop all</a><a href="#shop" onClick={() => setCategory('Home')}>Home</a><a href="#shop" onClick={() => setCategory('Tech')}>Objects</a><a href="#story">Our approach</a><a href="#seller">Seller analysis</a>
        </nav>
        <div className="header-actions">
          {searchOpen && <input autoFocus className="header-search" aria-label="Search products" placeholder="Find your thing..." value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }} />}
          <button className="icon-button search-toggle" aria-label={searchOpen ? 'Close search' : 'Search'} onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setQuery(''); else document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}><Icon name={searchOpen ? 'close' : 'search'} /></button>
          <button className="account-button" disabled={!authReady} onClick={() => { setAuthMessage(''); if (!account) setAuthMode('login'); setAccountOpen(true); }}><Icon name="user" size={18} /><span>{account ? account.name.split(' ')[0] : authReady ? 'Sign in' : 'Account'}</span></button>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${cartCount} items`}><Icon name="bag" /><span>Bag</span><b>{cartCount}</b></button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> GOOD THINGS, WELL MADE</p>
            <h1>Make room<br />for <em>the good</em><br />everyday.</h1>
            <p className="hero-description">Thoughtful things for slower mornings, lighter travels, and all the in-between.</p>
            <a className="dark-button" href="#shop">Find your everyday <Icon name="arrow" size={17} /></a>
            <div className="hero-proof"><span className="proof-mark">✳</span><p>Thoughtful essentials for everyday living</p></div>
          </div>
          <div className="hero-visual">
            <img src={imageUrl('photo-1490312278390-ab64016e0aa9')} alt="A sunlit, thoughtfully arranged living space" />
            <div className="hero-note"><span>01 / 04</span><p>A softer place<br />to land.</p><span className="note-line" /></div>
            <div className="hero-sticker">LESS, BUT<br /><i>better.</i></div>
          </div>
        </section>

        <section className="values-strip" id="story">
          <p>GOOD THINGS SHOULDN’T BE COMPLICATED.</p><span>✳</span>
          <div><b>Made with intention</b><small>Considered from start to finish</small></div>
          <div><b>Better materials</b><small>Built for your everyday, for longer</small></div>
          <div><b>Less, but better</b><small>Only the things worth keeping</small></div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div><p className="eyebrow">THE GOOD STUFF</p><h2>Everyday, <em>elevated.</em></h2></div>
            <p>Useful, beautiful, and made to earn its place.</p>
          </div>
          <div className="shop-controls">
            <div className="category-tabs" role="tablist" aria-label="Product categories">
              {categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label className="catalog-search"><Icon name="search" size={17} /><input type="search" aria-label="Search all products" placeholder="Search products..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear product search" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</label>
            <label className="sort-control">Sort by <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
          </div>
          {query && <div className="search-status"><span>{visibleProducts.length} {visibleProducts.length === 1 ? 'store product' : 'store products'} found for “{query}”</span><a href={`https://www.flipkart.com/search?q=${encodeURIComponent(query.trim())}`} target="_blank" rel="noopener noreferrer">Search live Flipkart results <Icon name="arrow" size={14} /></a></div>}
          {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} addToCart={addToCart} openProduct={setSelectedProduct} />)}</div> : <div className="empty-search"><span>Nothing on this shelf just yet.</span><button onClick={() => { setQuery(''); setCategory('Everything'); }}>See everything <Icon name="arrow" size={16} /></button></div>}
        </section>

        <section className="shopping-information" id="shopping-information" aria-labelledby="shopping-information-heading">
          <div className="section-heading">
            <div><p className="eyebrow">GOOD TO KNOW</p><h2 id="shopping-information-heading">The details, <em>made clear.</em></h2></div>
            <p>Helpful information before you add something to your everyday.</p>
          </div>
          <div className="shopping-information-grid">
            <article>
              <span className="information-index">01 / DELIVERY</span>
              <h3>Simple shipping</h3>
              <p>Delivery is ₹99 on orders below {money(freeShippingThreshold)}. Orders of {money(freeShippingThreshold)} or more ship free.</p>
            </article>
            <article>
              <span className="information-index">02 / CHECKOUT</span>
              <h3>A transparent demo</h3>
              <p>Checkout demonstrates pay on delivery. It does not process payments, send emails, or create a real shipment.</p>
            </article>
            <article>
              <span className="information-index">03 / REVIEWS</span>
              <h3>Reviews from signed-in customers</h3>
              <p>Sign in to leave one rating and review per product. You can update your review later.</p>
            </article>
          </div>
        </section>

        <SellerAnalytics orders={sellerOrders} />
        <section className="closing-banner"><div><p className="eyebrow">A THOUGHTFUL LITTLE NOTE</p><h2>Good things take<br /><em>a little thought.</em></h2><p>We think about the details, so you don’t have to.</p></div><a href="#shop" className="light-button">Meet your new favorite <Icon name="arrow" size={17} /></a><span className="closing-flower">✳</span></section>
      </main>
      <footer className="site-footer">
        <div className="footer-brand"><a className="wordmark" href="#home">commonplace<span>.</span></a><p>Fewer things. Better days.</p></div>
        <nav className="footer-links" aria-label="Explore the store"><b>Explore</b><a href="#shop">Shop all</a><a href="#story">Our approach</a><a href="#seller">Seller analysis</a></nav>
        <nav className="footer-links" aria-label="Store information"><b>Store information</b><a href="#shopping-information">Delivery & checkout</a><a href="#shopping-information">Product reviews</a><a href="#home">Back to top</a></nav>
        <div className="footer-note"><span>DEMO STOREFRONT</span><p>Orders and analytics are demonstrations. No payment is processed.</p></div>
        <div className="footer-bottom"><span>© 2026 Commonplace Goods</span><span>Thoughtful things for everyday living.</span></div>
      </footer>

      {notice && <div className="toast" role="status"><Icon name="check" size={17} />{notice}</div>}

      <ShoppingAssistant catalog={products} onViewProduct={setSelectedProduct} onAddToCart={addToCart} />

      {accountOpen && <Overlay className="account-overlay" onClose={() => setAccountOpen(false)}><div className="account-modal">
        <button className="modal-close icon-button" onClick={() => setAccountOpen(false)} aria-label="Close account"><Icon name="close" /></button>
        {account && authMode !== 'reset' ? <>
          <p className="eyebrow">YOUR COMMONPLACE</p>
          <h2>Your profile.</h2>
          <p className="auth-intro">Keep your account details up to date.</p>
          <form className="auth-form profile-form" onSubmit={submitProfile}>
            <label>Full name<input name="name" autoComplete="name" required maxLength="80" defaultValue={account.name} /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength="254" defaultValue={account.email} /></label>
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
            <button className="dark-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Saving…' : 'Save profile'} <Icon name="arrow" size={17} /></button>
          </form>
          <button className="profile-signout" type="button" disabled={authBusy} onClick={logout}>{authBusy ? 'Please wait…' : 'Sign out'}</button>
        </> : <>
          <p className="eyebrow">{authMode === 'signup' ? 'A GOOD PLACE TO START' : ['forgot', 'reset-link', 'reset'].includes(authMode) ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</p>
          <h2>{authMode === 'signup' ? 'Create your account.' : authMode === 'forgot' ? 'Forgot your password?' : authMode === 'reset-link' ? 'Your local reset link is ready.' : authMode === 'reset' ? 'Choose a new password.' : 'Sign in to your account.'}</h2>
          <p className="auth-intro">{authMode === 'signup' ? 'Save your details and make your next visit feel like yours.' : authMode === 'forgot' ? 'Enter your email to create a one-time reset link. This local demo does not send email.' : authMode === 'reset-link' ? 'No email was sent. Open this one-time link within 15 minutes.' : authMode === 'reset' ? 'Choose a new password. You will need to sign in again after resetting it.' : 'Good to have you back. Pick up where you left off.'}</p>
          {['login', 'signup'].includes(authMode) && <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={authMode === 'login'} className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthMessage(''); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={authMode === 'signup'} className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthMessage(''); }}>Create account</button>
          </div>}
          {['login', 'signup'].includes(authMode) && <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'signup' && <label>Full name<input name="name" autoComplete="name" required maxLength="80" placeholder="Jamie Taylor" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="you@example.com" /></label>
            <label>Password<input name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required minLength={authMode === 'signup' ? 8 : undefined} maxLength="128" placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>
            {authMode === 'signup' && <label className="auth-terms"><input type="checkbox" name="termsAccepted" required /><span>I agree to the store terms and privacy policy.</span></label>}
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
            <button className="dark-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="arrow" size={17} /></button>
          </form>}
          {authMode === 'login' && <button className="auth-text-button" type="button" onClick={() => { setAuthMode('forgot'); setAuthMessage(''); }}>Forgot your password?</button>}
          {authMode === 'forgot' && <form className="auth-form" onSubmit={submitForgotPassword}>
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="you@example.com" /></label>
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
            <button className="dark-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : 'Create reset link'} <Icon name="arrow" size={17} /></button>
          </form>}
          {authMode === 'reset-link' && <div className="auth-reset-ready" aria-live="polite">
            <a className="dark-button auth-submit" href={resetLink}>Open local reset link <Icon name="arrow" size={17} /></a>
          </div>}
          {authMode === 'reset' && <form className="auth-form" onSubmit={submitPasswordReset}>
            <label>New password<input name="password" type="password" autoComplete="new-password" required minLength="8" maxLength="128" placeholder="At least 8 characters" /></label>
            <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength="8" maxLength="128" placeholder="Enter it again" /></label>
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
            <button className="dark-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : 'Reset password'} <Icon name="arrow" size={17} /></button>
          </form>}
          {['forgot', 'reset-link', 'reset'].includes(authMode) && <button className="auth-text-button" type="button" onClick={returnToSignIn}>Back to sign in</button>}
          {['login', 'signup'].includes(authMode) && <p className="auth-security">Your password is securely hashed by the server. We never store it in your browser.</p>}
        </>}
      </div></Overlay>}

      {cartOpen && <div className="overlay drawer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" aria-label="Shopping bag">
        <div className="drawer-heading"><div><p className="eyebrow">YOUR GOOD THINGS</p><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" aria-label="Close bag" onClick={() => setCartOpen(false)}><Icon name="close" /></button></div>
        {cartItems.length ? <>
          <div className="shipping-progress">{subtotal >= freeShippingThreshold ? <p><Icon name="check" size={15} /> You’ve unlocked free shipping!</p> : <p>You’re {money(freeShippingThreshold - subtotal)} away from free shipping</p>}<div><span style={{ width: `${Math.min(subtotal / freeShippingThreshold * 100, 100)}%` }} /></div></div>
          <div className="cart-items">{cartItems.map((item) => <div className="cart-item" key={item.id}><img src={imageUrl(item.image)} alt="" /><div className="cart-item-info"><p>{item.name}</p><span>{money(item.price)}</span><div className="quantity-control"><button aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Icon name="minus" size={14} /></button><span>{item.quantity}</span><button aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Icon name="plus" size={14} /></button></div></div><button className="remove-item" aria-label={`Remove ${item.name}`} onClick={() => setCart((current) => { const next = { ...current }; delete next[item.id]; return next; })}><Icon name="close" size={16} /></button></div>)}</div>
          <div className="cart-summary"><p><span>Subtotal</span><b>{money(subtotal)}</b></p><p><span>Shipping</span><b>{shipping ? money(shipping) : 'Complimentary'}</b></p><p className="cart-total"><span>Total</span><b>{money(subtotal + shipping)}</b></p><button className="dark-button checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to checkout <Icon name="arrow" size={17} /></button><small>Demo checkout · No payment is processed</small></div>
        </> : <div className="empty-cart"><div className="empty-bag-icon"><Icon name="bag" size={26} /></div><h3>Your bag is taking a breather.</h3><p>Find something lovely to bring home.</p><button className="dark-button" onClick={() => { setCartOpen(false); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore the collection <Icon name="arrow" size={16} /></button></div>}
      </aside></div>}

      {selectedProduct && <Overlay className="product-overlay" onClose={() => setSelectedProduct(null)}><button className="modal-close icon-button" onClick={() => setSelectedProduct(null)} aria-label="Close product details"><Icon name="close" /></button><div className="product-detail"><img src={imageUrl(selectedProduct.image)} alt={selectedProduct.name} /><div className="product-detail-copy"><p className="eyebrow">{selectedProduct.category} / THOUGHTFULLY MADE</p><h2>{selectedProduct.name}</h2><p className="detail-price">{money(selectedProduct.price)} {selectedProduct.oldPrice && <s>{money(selectedProduct.oldPrice)}</s>}</p><p className="detail-description">{selectedProduct.description}</p><ul className="detail-points"><li><Icon name="check" size={16} /> Made for everyday, made to last</li><li><Icon name="check" size={16} /> Free shipping over {money(freeShippingThreshold)}</li><li><Icon name="check" size={16} /> Pay on delivery available in demo checkout</li></ul><button className="dark-button detail-add" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>Add to bag — {money(selectedProduct.price)} <Icon name="arrow" size={17} /></button></div></div><ProductReviews product={selectedProduct} account={account} onSignIn={() => { setSelectedProduct(null); setAuthMessage(''); setAuthMode('login'); setAccountOpen(true); }} /></Overlay>}

      {checkoutOpen && <Overlay className="checkout-overlay" onClose={() => setCheckoutOpen(false)}><div className="checkout-modal"><div className="checkout-top"><div><p className="eyebrow">ALMOST YOURS</p><h2>Delivery details</h2></div><button className="icon-button" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><Icon name="close" /></button></div><form onSubmit={placeOrder}><div className="checkout-fields"><label>Full name<input name="name" autoComplete="name" required maxLength="100" placeholder="Jamie Taylor" /></label><label>Mobile number (+91)<input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required pattern="[6-9][0-9]{9}" maxLength="10" title="Enter a valid 10-digit Indian mobile number" placeholder="98765 43210" /></label><label className="full-field">Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="jamie@example.com" /></label><label className="full-field">Street address<input name="address" autoComplete="street-address" required maxLength="160" placeholder="House number, street, locality" /></label><label>City<input name="city" autoComplete="address-level2" required maxLength="80" placeholder="Bengaluru" /></label><label>State<input name="state" autoComplete="address-level1" required maxLength="80" placeholder="Karnataka" /></label><label>PIN code<input name="postal" inputMode="numeric" autoComplete="postal-code" required pattern="[1-9][0-9]{5}" maxLength="6" title="Enter a valid 6-digit Indian PIN code" placeholder="560001" /></label></div><div className="payment-note"><span className="payment-check"><Icon name="check" size={15} /></span><div><b>Pay on delivery</b><small>This demo checkout doesn’t collect payment details.</small></div><span className="demo-label">DEMO</span></div><div className="checkout-totals"><p><span>{cartCount} items</span><b>{money(subtotal)}</b></p><p><span>Shipping</span><b>{shipping ? money(shipping) : 'Complimentary'}</b></p><p className="cart-total"><span>Total due on delivery</span><b>{money(subtotal + shipping)}</b></p></div><button className="dark-button checkout-submit" type="submit">Place demo order <Icon name="arrow" size={17} /></button><p className="checkout-footnote">Demo store · No payment is processed and no email is sent.</p></form></div></Overlay>}

      {order && <Overlay className="order-overlay" onClose={() => setOrder(null)}><div className="order-confirmation"><div className="order-check"><Icon name="check" size={30} /></div><p className="eyebrow">WELL CHOSEN</p><h2>Good things<br /><em>are on their way.</em></h2><p className="order-greeting">Thanks, {order.name.split(' ')[0]}. Your demo order is saved on this device.</p><div className="order-number"><span>ORDER NUMBER</span><b>{order.id}</b></div><div className="order-info"><p><span>Delivering to</span><b>{order.address}</b></p><p><span>Contact</span><b>+91 {order.phone}<br />{order.email}</b></p><p><span>Order total · Pay on delivery</span><b>{money(order.total)}</b></p></div><p className="order-email">No payment was processed and no email was sent.</p><button className="dark-button" onClick={() => { setOrder(null); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}>Keep wandering <Icon name="arrow" size={17} /></button></div></Overlay>}
    </div>
  );
}

export default App;
