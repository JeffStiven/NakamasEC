/*
  Si ves "permission denied for table products", ejecuta estas instrucciones SQL
  en el editor SQL de Supabase para habilitar RLS y dar permisos correctos:

  ALTER TABLE products ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Clientes pueden ver productos"
  ON products FOR SELECT
  TO public
  USING (true);

  CREATE POLICY "Solo el administrador puede modificar"
  ON products FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'jeffstiven.1605@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'jeffstiven.1605@gmail.com');
*/

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://xblbtxnknhpomjukhygo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dH-XQhKWs5-4S-LFPesrOQ_Fgw_HW-Y';
const TABLE = 'products';
const PRODUCT_CATEGORIES = ['Compartidos', 'Personalizados', 'Anime'];

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_tpnmh3w';
const EMAILJS_TEMPLATE_ID = 'template_jc497ug';
const EMAILJS_OWNER_TEMPLATE_ID = 'template_dqfbfgb';
const RECIPIENT_EMAIL = 'nayrobik.riofrio@gmail.com';
let emailjsLib = null;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function initEmailJS() {
  if (typeof window.emailjs !== 'undefined') {
    emailjsLib = window.emailjs;
    emailjsLib.init('ogK3SNhFxfbAS41_s');
  } else {
    console.error('EmailJS no se pudo cargar: emailjs no está definido globalmente.');
    emailjsLib = null;
  }
}
const productsGrid = document.getElementById('productsGrid');
const modal = document.getElementById('categoryModal');
const modalProducts = document.getElementById('modalProducts');
const modalCategoryName = document.getElementById('modalCategoryName');
const categoryCards = document.querySelectorAll('.cat-card');
const newsletterForm = document.getElementById('newsletterForm');
const newsletterName = document.getElementById('newsletterName');
const newsletterEmail = document.getElementById('newsletterEmail');
const newsletterMessage = document.getElementById('newsletterMessage');

function parseImageValue(value) {
  if (!value || typeof value !== 'string') return { src: '', fit: 'cover', position: 'center' };
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.src) {
      return {
        src: parsed.src,
        fit: parsed.fit || 'cover',
        position: parsed.position || 'center'
      };
    }
  } catch (err) {
    // plain URL string
  }
  return { src: value, fit: 'cover', position: 'center' };
}

const sampleProducts = [
  {
    id: 'p1',
    name: 'Pulsera Luffy Pirate King',
    series: 'One Piece',
    description: 'Pulsera estilo pirate king con detalles rojos y negros.',
    price: '$12',
    image: 'images/llavero1.jpg'
  },
  {
    id: 'p2',
    name: 'Pulsera Tanjiro Breathing',
    series: 'Demon Slayer',
    description: 'Pulsera inspirada en la respiración del agua de Tanjiro.',
    price: '$14',
    image: 'images/llavero2.jpg'
  },
  {
    id: 'p3',
    name: 'Pulsera Sharingan Eye',
    series: 'Naruto',
    description: 'Pulsera con diseño del Sharingan para fans ninjas.',
    price: '$10',
    image: 'images/llavero3.jpg'
  },
  {
    id: 'p4',
    name: 'Pulsera Scout Regiment',
    series: 'Attack on Titan',
    description: 'Pulsera con el símbolo de la Legión de Reconocimiento.',
    price: '$13',
    image: 'images/llavero4.jpg'
  }
];

function createCardHTML(product, extraClass = '') {
  const imageData = parseImageValue(product.image);
  return `
    <div class="product-card ${extraClass}" data-id="${product.id}">
      <div class="product-img">
        ${imageData.src ? `<img src="${imageData.src}" alt="${product.name}" style="object-fit:${imageData.fit}; object-position:${imageData.position};">` : '🎴'}
      </div>
      <div class="product-info">
        <div class="product-series">${product.series || 'Sin categoría'}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-description">${product.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">${product.price || 'Consulta precio'}</div>
        </div>
      </div>
    </div>
  `;
}

function normalizeCategory(value) {
  if (!value) return 'Otros';
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('compart')) return 'Compartidos';
  if (normalized.includes('personal')) return 'Personalizados';
  if (normalized.includes('anime')) return 'Anime';
  return 'Otros';
}

function groupProductsByCategory(products) {
  const grouped = PRODUCT_CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, { Otros: [] });

  products.forEach(product => {
    const category = normalizeCategory(product.series);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(product);
  });

  return grouped;
}

function renderCategorySection(category, products) {
  const cardsHTML = products.map(product => createCardHTML(product)).join('');
  return `
    <div class="category-block reveal" data-category="${category}">
      <div class="category-header">
        <div class="category-info">
          <div class="category-name">${category}</div>
          <div class="category-tag">${products.length} productos</div>
        </div>
        <div class="category-actions">
          <button class="category-prev" type="button">◀</button>
          <button class="category-next" type="button">▶</button>
          <button class="btn-tertiary category-view-all" type="button">Ver todo</button>
        </div>
      </div>
      <div class="category-row">${cardsHTML}</div>
    </div>
  `;
}

function renderProducts(products) {
  const grouped = groupProductsByCategory(products);
  const sections = Object.entries(grouped)
    .filter(([key, items]) => items.length)
    .map(([category, items]) => renderCategorySection(category, items))
    .join('');

  productsGrid.innerHTML = sections;
  setupCategoryControls();
  observeRevealElements();
}

function renderFallback() {
  const fallbackNotice = '<div class="fallback-notice reveal"><strong>Catálogo temporal:</strong> configura Supabase en main.js para cargar los productos reales desde la base de datos.</div>';
  const grouped = groupProductsByCategory(sampleProducts);
  const sections = Object.entries(grouped)
    .filter(([key, items]) => items.length)
    .map(([category, items]) => renderCategorySection(category, items))
    .join('');
  productsGrid.innerHTML = fallbackNotice + sections;
  setupCategoryControls();
  observeRevealElements();
}

function setupCategoryControls() {
  productsGrid.querySelectorAll('.category-prev').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('.category-block').querySelector('.category-row');
      row.scrollBy({ left: -300, behavior: 'smooth' });
    });
  });

  productsGrid.querySelectorAll('.category-next').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('.category-block').querySelector('.category-row');
      row.scrollBy({ left: 300, behavior: 'smooth' });
    });
  });

  productsGrid.querySelectorAll('.category-view-all').forEach(button => {
    button.addEventListener('click', () => {
      const categoryBlock = button.closest('.category-block');
      const category = categoryBlock.dataset.category;
      const products = Array.from(categoryBlock.querySelectorAll('.product-card')).map(card => ({
        id: card.dataset.id,
        name: card.querySelector('.product-name')?.textContent.trim() || '',
        series: card.querySelector('.product-series')?.textContent.trim() || '',
        description: card.querySelector('.product-description')?.textContent.trim() || '',
        price: card.querySelector('.product-price')?.textContent.trim() || '',
        image: card.querySelector('.product-img img')?.src || ''
      }));
      openCategoryModal(category, products);
    });
  });
}

function observeRevealElements() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('visible');
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleNewsletterSubmit(event) {
  event.preventDefault();
  if (!newsletterEmail) return;

  const name = newsletterName.value.trim();
  const email = newsletterEmail.value.trim();
  if (!name) {
    newsletterMessage.textContent = 'Ingresa tu nombre para suscribirte.';
    newsletterMessage.style.color = 'var(--red)';
    return;
  }
  if (!isValidEmail(email)) {
    newsletterMessage.textContent = 'Ingresa un correo válido para suscribirte.';
    newsletterMessage.style.color = 'var(--red)';
    return;
  }

  const subscriptionDate = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const subscriberDate = subscriptionDate;

  if (!emailjsLib) {
    newsletterMessage.textContent = 'No se pudo cargar el servicio de correo. Intenta de nuevo más tarde.';
    newsletterMessage.style.color = 'var(--red)';
    return;
  }

  // Disable button during sending
  const button = document.getElementById('newsletterButton');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Enviando...';

  // Send emails using EmailJS
  const subscriberParams = {
    email: email,
    reply_to: RECIPIENT_EMAIL,
    name: name,
    from_name: name,
    subscriber_name: name,
    user_name: name,
    sender_name: name,
    nombre: name,
    first_name: name,
    firstname: name,
    full_name: name,
    subscriber_email: email,
    subscriber_date: subscriberDate,
    date: subscriberDate,
    subscription_date: subscriptionDate,
    subject: 'Bienvenido a NakamasEc',
    message: `¡Hola ${name}! Gracias por suscribirte a NakamasEc.`
  };

  const ownerParams = {
    email: RECIPIENT_EMAIL,
    reply_to: email,
    name: name,
    from_name: name,
    subscriber_name: name,
    user_name: name,
    sender_name: name,
    nombre: name,
    first_name: name,
    firstname: name,
    full_name: name,
    subscriber_email: email,
    subscriber_date: subscriberDate,
    date: subscriberDate,
    subscription_date: subscriptionDate,
    subject: 'Nuevo suscriptor NAKAMAS',
    message: `Se suscribió un nuevo correo: ${email}\nNombre: ${name}\nFecha: ${subscriptionDate}`
  };

  console.log('EmailJS params', { subscriberParams, ownerParams });

  Promise.allSettled([
    emailjsLib.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, subscriberParams),
    emailjsLib.send(EMAILJS_SERVICE_ID, EMAILJS_OWNER_TEMPLATE_ID, ownerParams)
  ])
    .then((results) => {
      const subscriberResult = results[0];
      if (subscriberResult.status === 'fulfilled') {
        newsletterMessage.textContent = '✓ Gracias, tu suscripción fue recibida correctamente.';
        newsletterMessage.style.color = 'var(--green)';
        newsletterEmail.value = '';
      } else {
        console.error('EmailJS subscriber error:', subscriberResult.reason);
        newsletterMessage.textContent = 'Hubo un error al procesar tu suscripción. Intenta de nuevo.';
        newsletterMessage.style.color = 'var(--red)';
      }

      const ownerResult = results[1];
      if (ownerResult.status === 'rejected') {
        console.warn('EmailJS owner notification failed:', ownerResult.reason);
      }
    })
    .catch((error) => {
      console.error('EmailJS error:', error);
      newsletterMessage.textContent = 'Hubo un error al procesar tu suscripción. Intenta de nuevo.';
      newsletterMessage.style.color = 'var(--red)';
    })
    .finally(() => {
      button.disabled = false;
      button.textContent = originalText;
    });
}

function initPageInteractions() {
  categoryCards.forEach(card => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      const category = card.dataset.category;
      const target = document.querySelector(`.category-block[data-category="${category}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }
}

function openCategoryModal(category, products) {
  if (!modal || !modalProducts || !modalCategoryName) return;
  modalCategoryName.textContent = category;
  modalProducts.innerHTML = products.map(product => createCardHTML(product, 'modal-card')).join('');
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeCategoryModal() {
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target.classList.contains('category-modal') || event.target.classList.contains('modal-close') || event.target.classList.contains('category-modal-backdrop')) {
      closeCategoryModal();
    }
  });
}

async function loadProducts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    renderFallback();
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,name,series,description,price,image')
    .order('id', { ascending: true });

  if (error || !data) {
    console.warn('Supabase error:', error);
    if (error?.message?.includes('permission denied')) {
      productsGrid.innerHTML = '<div class="fallback-notice reveal"><strong>Error de permisos:</strong> revisa las políticas RLS de la tabla <code>products</code> en Supabase.</div>';
      return;
    }
    renderFallback();
    return;
  }

  if (!data.length) {
    renderFallback();
    return;
  }

  renderProducts(data);
}

window.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  loadProducts();
  initPageInteractions();
});
