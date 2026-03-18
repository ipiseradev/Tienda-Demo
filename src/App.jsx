import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { CATEGORIES, generateCatalog } from "./data/catalog";
import { formatARS, formatCompactNumber } from "./lib/format";
import { useDebouncedValue } from "./lib/useDebouncedValue";
import { useLocalStorageState } from "./lib/useLocalStorage";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowLeft, FiMapPin, FiSearch, FiShoppingCart, FiTruck, FiX } from "react-icons/fi";

const STORE = {
  name: "Moda Urbana Lanús",
  phoneWhatsapp: "54911XXXXXXXXXX",
  pickupLocations: ["Gerli", "Estación de Lanús"],
  locationLine: "Lanús / Gerli",
};

const SORTS = [
  { id: "relevance", label: "Relevancia" },
  { id: "price-asc", label: "Menor precio" },
  { id: "price-desc", label: "Mayor precio" },
  { id: "name-asc", label: "Nombre A→Z" },
];

const buildWaLink = (phone, text) =>
  `https://wa.me/${String(phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;

function getFallbackImage(product) {
  const seed = product?.id || product?.sku || product?.name || "producto";
  return `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/900/1100`;
}

function SmartImage({
  src,
  alt,
  className,
  fallbackSrc,
  ...props
}) {
  const finalFallback = fallbackSrc || "https://picsum.photos/seed/default-product/900/1100";
  const [imgSrc, setImgSrc] = useState(src || finalFallback);

  useEffect(() => {
    setImgSrc(src || finalFallback);
  }, [src, finalFallback]);

  return (
    <img
      {...props}
      className={className}
      src={imgSrc}
      alt={alt}
      onError={() => {
        if (imgSrc !== finalFallback) setImgSrc(finalFallback);
      }}
    />
  );
}

function App() {
  const products = useMemo(() => {
    return generateCatalog(900).map((p) => ({
      ...p,
      image: p.image || getFallbackImage(p),
    }));
  }, []);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 120);
  const [category, setCategory] = useState("Todos");
  const [sort, setSort] = useState("relevance");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  const [cart, setCart] = useLocalStorageState("store_cart_v2", []);
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [notice, setNotice] = useState("");
  const [cartBump, setCartBump] = useState(false);

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [shipping, setShipping] = useState({
    mode: "pickup",
    pickupLocation: STORE.pickupLocations[0],
    address: "",
    city: "",
    zip: "",
    note: "",
  });
  const [payment, setPayment] = useState({
    method: "Mercado Pago",
    wantInvoice: false,
  });
  const [checkoutTouched, setCheckoutTouched] = useState(false);

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);
  const cityRef = useRef(null);
  const zipRef = useRef(null);

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutTouched(false);
  };

  useEffect(() => {
    if (!cartBump) return;
    const t = window.setTimeout(() => setCartBump(false), 260);
    return () => window.clearTimeout(t);
  }, [cartBump]);

  const filtered = useMemo(() => {
    const q = String(debouncedQuery || "").trim().toLowerCase();
    let list = products;

    if (category !== "Todos") list = list.filter((p) => p.category === category);
    if (onlyInStock) list = list.filter((p) => p.stock > 0);
    if (q) {
      list = list.filter((p) => {
        const text = `${p.name} ${p.sku} ${p.category}`.toLowerCase();
        return text.includes(q);
      });
    }

    const sorter = {
      relevance: (a, b) => a.id - b.id,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "name-asc": (a, b) => a.name.localeCompare(b.name, "es"),
    }[sort];

    return [...list].sort(sorter ?? ((a, b) => a.id - b.id));
  }, [products, debouncedQuery, category, onlyInStock, sort]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingText = shipping.mode === "delivery" ? "Costo a confirmar según zona" : "Gratis";
  const total = subtotal;

  const checkoutErrors = useMemo(() => {
    return {
      name: !customer.name.trim(),
      phone: !customer.phone.trim(),
      address: shipping.mode === "delivery" && !shipping.address.trim(),
      city: shipping.mode === "delivery" && !shipping.city.trim(),
      zip: shipping.mode === "delivery" && !shipping.zip.trim(),
    };
  }, [customer.name, customer.phone, shipping.mode, shipping.address, shipping.city, shipping.zip]);

  const canFinalize =
    !checkoutErrors.name &&
    !checkoutErrors.phone &&
    !checkoutErrors.address &&
    !checkoutErrors.city &&
    !checkoutErrors.zip;

  const toastTimeoutRef = useRef(null);
  const setToast = (msg) => {
    setNotice(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setNotice(""), 1900);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setProductOpen(null);
      setCheckoutOpen(false);
      setCheckoutTouched(false);
      setCartOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const isOverlayOpen = Boolean(cartOpen || checkoutOpen || productOpen);
    if (!isOverlayOpen) return;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [cartOpen, checkoutOpen, productOpen]);

  const addToCart = (product) => {
    if (!product || product.stock <= 0) return setToast("Sin stock por el momento.");

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.qty + 1, Math.max(1, product.stock));
        return prev.map((i) => (i.id === product.id ? { ...i, qty: nextQty } : i));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          price: product.price,
          image: product.image || getFallbackImage(product),
          maxQty: Math.max(1, product.stock),
          qty: 1,
        },
      ];
    });
    setToast("Agregado al carrito.");
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setCart([]);
  const setQty = (id, nextQty) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const limit = Math.max(1, Number(i.maxQty || 99));
        const qty = Math.min(limit, Math.max(1, Math.floor(nextQty || 1)));
        return { ...i, qty };
      }),
    );
  };

  const openCheckout = () => {
    if (cart.length === 0) return setToast("Tu carrito está vacío.");
    setCartOpen(false);
    setCheckoutTouched(false);
    setCheckoutOpen(true);
    window.setTimeout(() => {
      nameRef.current?.focus?.();
    }, 0);
  };

  const finalizeWhatsApp = () => {
    if (cart.length === 0) return;
    setCheckoutTouched(true);

    if (!canFinalize) {
      setToast("Revisá los campos marcados para finalizar.");
      if (checkoutErrors.name) nameRef.current?.focus?.();
      else if (checkoutErrors.phone) phoneRef.current?.focus?.();
      else if (checkoutErrors.address) addressRef.current?.focus?.();
      else if (checkoutErrors.city) cityRef.current?.focus?.();
      else if (checkoutErrors.zip) zipRef.current?.focus?.();
      return;
    }

    const lines = [];
    lines.push(`Hola! Quiero comprar en *${STORE.name}*.`);
    lines.push("");

    for (const item of cart) {
      lines.push(`- ${item.name} x${item.qty} — ${formatARS(item.price * item.qty)}`);
    }

    lines.push("");
    lines.push(`Total parcial: ${formatARS(subtotal)}`);
    lines.push(`Entrega: ${shipping.mode === "pickup" ? `Retiro (${shipping.pickupLocation})` : "Envío a domicilio"}`);

    if (shipping.mode === "delivery") {
      lines.push(`Dirección: ${shipping.address}, ${shipping.city} (${shipping.zip})`);
      lines.push("Envío: costo a confirmar según zona");
    }

    lines.push(`TOTAL: ${formatARS(total)}`);
    lines.push(`Pago: ${payment.method}`);

    if (payment.wantInvoice) lines.push("Factura: Sí");

    if (customer.name || customer.phone || customer.email) {
      lines.push("");
      if (customer.name) lines.push(`Nombre: ${customer.name}`);
      if (customer.phone) lines.push(`Tel: ${customer.phone}`);
      if (customer.email) lines.push(`Email: ${customer.email}`);
    }

    if (shipping.note) {
      lines.push("");
      lines.push(`Notas: ${shipping.note}`);
    }

    lines.push("");
    lines.push("Gracias!");

    window.open(buildWaLink(STORE.phoneWhatsapp, lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  const heroImage =
    "https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="app">
      <a className="skip" href="#catalogo">
        Saltar al catálogo
      </a>

      <header className="header">
        <div className="topbar">
          <div className="wrap topbarInner">
            <span>{formatCompactNumber(products.length)}+ productos</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>Envíos a todo el país</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>Retiro en {STORE.pickupLocations.join(" / ")}</span>
          </div>
        </div>

        <div className="wrap headerInner">
          <div className="brand" aria-label={STORE.name}>
            <div className="brandMark" aria-hidden="true">
              {STORE.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="brandName">{STORE.name}</div>
          </div>

          <div className="search" role="search">
            <FiSearch className="searchIcon" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => {
                setVisibleCount(24);
                setQuery(e.target.value);
              }}
              placeholder="Buscar productos…"
              aria-label="Buscar productos"
            />
          </div>

          <button
            className={`cartBtn ${cartBump ? "bump" : ""}`}
            onClick={() => {
              setCartBump(true);
              setCartOpen(true);
            }}
            aria-label="Abrir carrito"
          >
            <FiShoppingCart aria-hidden="true" />
            <span className="cartCount">{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap heroInner">
            <div className="heroCopy">
              <h1>Nueva colección disponible</h1>
              <p className="heroSub">Comprá online con envío o retiro</p>

              <div className="heroActions">
                <a className="btn primary" href="#catalogo">
                  Comprar ahora
                </a>
                <a className="btn secondary" href="#catalogo">
                  Ver catálogo
                </a>
              </div>

              <div className="heroMeta">
                <span>Más de 900 productos</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>Pagos digitales</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>Atención por WhatsApp</span>
              </div>

              <div className="heroSteps" aria-label="Cómo comprar">
                Comprá fácil y rápido: <b>buscás</b> · <b>agregás al carrito</b> · <b>elegís envío o retiro</b> ·{" "}
                <b>confirmás por WhatsApp</b>
              </div>
            </div>

            <div className="heroMedia" aria-hidden="true">
              <SmartImage
                src={heroImage}
                fallbackSrc="https://picsum.photos/seed/hero-store/1600/1000"
                alt="Colección destacada"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="wrap section" id="catalogo">
          <div className="sectionHead">
            <h2>Catálogo</h2>

            <div className="filters">
              <select
                value={category}
                onChange={(e) => {
                  setVisibleCount(24);
                  setCategory(e.target.value);
                }}
                aria-label="Filtrar por categoría"
              >
                <option value="Todos">Todos</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => {
                    setVisibleCount(24);
                    setOnlyInStock(e.target.checked);
                  }}
                />
                <span>Solo disponibles</span>
              </label>
            </div>
          </div>

          <div className="grid">
            {visibleProducts.map((p) => (
              <article className="product" key={p.id}>
                <button className="productMedia" onClick={() => setProductOpen(p)} aria-label={`Ver ${p.name}`}>
                  <SmartImage
                    src={p.image}
                    fallbackSrc={getFallbackImage(p)}
                    alt={p.name}
                    loading="lazy"
                  />
                </button>

                <div className="productInfo">
                  <div className="productName">{p.name}</div>
                  <div className="productRow">
                    <div className="productPrice">{formatARS(p.price)}</div>
                    <button className="productAdd" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="loadMore">
              <button className="btn secondary" onClick={() => setVisibleCount((n) => n + 24)}>
                Cargar más
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footerInner">
          <div className="footerLeft">
            <div className="footerBrand">{STORE.name}</div>
            <div className="footerMeta">
              <span>{STORE.locationLine}</span>
              <span className="dot" aria-hidden="true">·</span>
              <a
                href={buildWaLink(STORE.phoneWhatsapp, `Hola! Quiero consultar por productos en ${STORE.name}.`)}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
            <div className="footerCopy">© 2026 · Todos los derechos reservados</div>
          </div>

          <nav className="footerLinks" aria-label="Links">
            <a href="#catalogo">Catálogo</a>
            <button className="linkLike" onClick={() => setCartOpen(true)}>
              Carrito
            </button>
            <a
              href={buildWaLink(STORE.phoneWhatsapp, `Hola! Quiero comprar en ${STORE.name}.`)}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>

      {notice ? (
        <div className="toast" role="status">
          {notice}
        </div>
      ) : null}

      {productOpen && (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={() => setProductOpen(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalGrid">
              <SmartImage
                className="modalImg"
                src={productOpen.image}
                fallbackSrc={getFallbackImage(productOpen)}
                alt={productOpen.name}
              />

              <div className="modalBody">
                <div className="modalName">{productOpen.name}</div>
                <div className="modalPrice">{formatARS(productOpen.price)}</div>

                <div className="modalActions">
                  <button className="btn secondary" onClick={() => setProductOpen(null)}>
                    Cerrar
                  </button>
                  <button className="btn primary" onClick={() => addToCart(productOpen)} disabled={productOpen.stock <= 0}>
                    Agregar al carrito
                  </button>
                </div>

                <div className="modalNote">Consultá talles, colores y disponibilidad por WhatsApp.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={() => setCartOpen(false)}>
          <div className="modal cartModal" onMouseDown={(e) => e.stopPropagation()} aria-label="Carrito">
            <div className="drawerHead">
              <div className="drawerTitle">Carrito</div>
              <button className="iconBtn" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
                <FiX aria-hidden="true" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">Tu carrito está vacío</div>
                <button className="btn primary" onClick={() => setCartOpen(false)}>
                  Ver catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="items">
                  {cart.map((item) => (
                    <div className="cartItem" key={item.id}>
                      <SmartImage
                        className="cartImg"
                        src={item.image}
                        fallbackSrc={getFallbackImage(item)}
                        alt={item.name}
                      />

                      <div className="cartMain">
                        <div className="cartName">{item.name}</div>
                        <div className="cartRow">
                          <div className="qty">
                            <button
                              className="qtyBtn"
                              onClick={() => setQty(item.id, item.qty - 1)}
                              disabled={item.qty <= 1}
                              aria-label="Restar"
                            >
                              –
                            </button>
                            <span className="qtyVal">{item.qty}</span>
                            <button
                              className="qtyBtn"
                              onClick={() => setQty(item.id, item.qty + 1)}
                              disabled={item.qty >= (item.maxQty ?? 99)}
                              aria-label="Sumar"
                            >
                              +
                            </button>
                          </div>
                          <div className="cartPrice">{formatARS(item.price * item.qty)}</div>
                        </div>
                        <button className="linkLike danger" onClick={() => removeFromCart(item.id)}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="summary">
                  <div className="sumRow">
                    <span>Subtotal</span>
                    <span>{formatARS(subtotal)}</span>
                  </div>
                  <div className="sumActions">
                    <button className="btn secondary" onClick={clearCart}>
                      Vaciar
                    </button>
                    <button className="btn primary" onClick={openCheckout}>
                      Finalizar compra
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={closeCheckout}>
          <div className="modal modalWide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="drawerHead">
              <div className="drawerTitle">Finalizar compra</div>
              <button className="iconBtn" onClick={closeCheckout} aria-label="Cerrar">
                <FiX aria-hidden="true" />
              </button>
            </div>

            <div className="checkoutGrid">
              <div className="checkoutCol">
                <div className="panel">
                  <div className="panelTitle">Información de contacto</div>
                  <div className="formGrid">
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        ref={nameRef}
                        value={customer.name}
                        onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                        onBlur={() => setCheckoutTouched(true)}
                        autoComplete="name"
                        aria-invalid={checkoutTouched && checkoutErrors.name}
                      />
                      {checkoutTouched && checkoutErrors.name ? <div className="fieldError">Requerido</div> : null}
                    </label>

                    <label className="field">
                      <span>Teléfono</span>
                      <input
                        ref={phoneRef}
                        type="tel"
                        inputMode="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                        onBlur={() => setCheckoutTouched(true)}
                        autoComplete="tel"
                        aria-invalid={checkoutTouched && checkoutErrors.phone}
                      />
                      {checkoutTouched && checkoutErrors.phone ? <div className="fieldError">Requerido</div> : null}
                    </label>

                    <label className="field full">
                      <span>Email</span>
                      <input
                        type="email"
                        inputMode="email"
                        value={customer.email}
                        onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                        autoComplete="email"
                      />
                    </label>
                  </div>
                </div>

                <div className="panel">
                  <div className="panelTitle">Método de entrega</div>
                  <div className="deliveryCards" role="radiogroup" aria-label="Método de entrega">
                    <button
                      type="button"
                      className={`deliveryCard ${shipping.mode === "pickup" ? "active" : ""}`}
                      onClick={() => setShipping((s) => ({ ...s, mode: "pickup" }))}
                      aria-pressed={shipping.mode === "pickup"}
                    >
                      <div className="deliveryIcon" aria-hidden="true">
                        <FiMapPin />
                      </div>
                      <div className="deliveryText">
                        <div className="deliveryTitle">Retiro en tienda</div>
                        <div className="deliverySub">{STORE.pickupLocations.join(" / ")}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`deliveryCard ${shipping.mode === "delivery" ? "active" : ""}`}
                      onClick={() => setShipping((s) => ({ ...s, mode: "delivery" }))}
                      aria-pressed={shipping.mode === "delivery"}
                    >
                      <div className="deliveryIcon" aria-hidden="true">
                        <FiTruck />
                      </div>
                      <div className="deliveryText">
                        <div className="deliveryTitle">Envío a domicilio</div>
                        <div className="deliverySub">A confirmar según zona</div>
                      </div>
                    </button>
                  </div>

                  {shipping.mode === "pickup" ? (
                    <label className="field">
                      <span>Local</span>
                      <select
                        value={shipping.pickupLocation}
                        onChange={(e) => setShipping((s) => ({ ...s, pickupLocation: e.target.value }))}
                      >
                        {STORE.pickupLocations.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="formGrid">
                      <label className="field full">
                        <span>Dirección</span>
                        <input
                          ref={addressRef}
                          value={shipping.address}
                          onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                          onBlur={() => setCheckoutTouched(true)}
                          autoComplete="street-address"
                          aria-invalid={checkoutTouched && checkoutErrors.address}
                        />
                        {checkoutTouched && checkoutErrors.address ? <div className="fieldError">Requerido</div> : null}
                      </label>

                      <label className="field">
                        <span>Localidad</span>
                        <input
                          ref={cityRef}
                          value={shipping.city}
                          onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                          onBlur={() => setCheckoutTouched(true)}
                          autoComplete="address-level2"
                          aria-invalid={checkoutTouched && checkoutErrors.city}
                        />
                        {checkoutTouched && checkoutErrors.city ? <div className="fieldError">Requerido</div> : null}
                      </label>

                      <label className="field">
                        <span>Código postal</span>
                        <input
                          ref={zipRef}
                          value={shipping.zip}
                          onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                          onBlur={() => setCheckoutTouched(true)}
                          autoComplete="postal-code"
                          inputMode="numeric"
                          aria-invalid={checkoutTouched && checkoutErrors.zip}
                        />
                        {checkoutTouched && checkoutErrors.zip ? <div className="fieldError">Requerido</div> : null}
                      </label>
                    </div>
                  )}

                  <label className="field">
                    <span>Notas</span>
                    <textarea rows={3} value={shipping.note} onChange={(e) => setShipping((s) => ({ ...s, note: e.target.value }))} />
                  </label>
                </div>

                <div className="panel">
                  <div className="panelTitle">Método de pago</div>
                  <label className="field">
                    <span>Método</span>
                    <select value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}>
                      <option>Mercado Pago</option>
                      <option>Transferencia</option>
                    </select>
                  </label>

                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={payment.wantInvoice}
                      onChange={(e) => setPayment((p) => ({ ...p, wantInvoice: e.target.checked }))}
                    />
                    <span>Solicitar factura</span>
                  </label>
                </div>
              </div>

              <div className="checkoutCol">
                <div className="panel">
                  <div className="panelTitle">Resumen</div>
                  <div className="miniList">
                    {cart.map((i) => (
                      <div className="miniRow" key={i.id}>
                        <div className="miniLeft">
                          <SmartImage
                            className="miniThumb"
                            src={i.image}
                            fallbackSrc={getFallbackImage(i)}
                            alt={i.name}
                          />
                          <div className="miniText">
                            <div className="miniTitle">{i.name}</div>
                            <div className="miniSub">Cantidad: {i.qty}</div>
                          </div>
                        </div>
                        <div className="miniRight">{formatARS(i.price * i.qty)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="divider" role="separator" />
                  <div className="sumRow">
                    <span>Total parcial</span>
                    <span>{formatARS(subtotal)}</span>
                  </div>
                  <div className="sumRow">
                    <span>Envío</span>
                    <span>{shippingText}</span>
                  </div>

                  <div className="totalBlock" aria-label="Total a pagar">
                    <div className="totalLabel">TOTAL A PAGAR</div>
                    <div className="totalValue">{formatARS(total)}</div>
                  </div>

                  <div className="checkoutActions">
                    <button className="btn backBtn" onClick={closeCheckout}>
                      <FiArrowLeft aria-hidden="true" />
                      Volver
                    </button>
                    <button className="btn checkoutPrimary" onClick={finalizeWhatsApp} disabled={!canFinalize}>
                      <FaWhatsapp aria-hidden="true" />
                      Finalizar compra por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <a
        className="waFloat"
        href={buildWaLink(STORE.phoneWhatsapp, `Hola! Quiero consultar por productos en ${STORE.name}.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Consultar por WhatsApp"
      >
        <FaWhatsapp aria-hidden="true" />
        WhatsApp
      </a>
    </div>
  );
}

export default App;