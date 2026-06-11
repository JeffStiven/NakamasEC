/*
  Ejecuta estas instrucciones SQL en Supabase para activar RLS y dar permisos correctos.

  ALTER TABLE products ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Clientes pueden ver productos"
  ON products FOR SELECT
  TO public
  USING (true);

  CREATE POLICY "Admin puede ver productos"
  ON products FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'jeffstiven.1605@gmail.com');

  CREATE POLICY "Solo el administrador puede modificar"
  ON products FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'jeffstiven.1605@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'jeffstiven.1605@gmail.com');
*/

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://xblbtxnknhpomjukhygo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dH-XQhKWs5-4S-LFPesrOQ_Fgw_HW-Y';
const ADMIN_EMAIL = 'jeffstiven.1605@gmail.com';
const TABLE = 'products';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const elements = {
  adminAuth: document.getElementById('adminAuth'),
  authForm: document.getElementById('authForm'),
  adminEmail: document.getElementById('adminEmail'),
  adminPassword: document.getElementById('adminPassword'),
  createAdminBtn: document.getElementById('createAdminBtn'),
  authError: document.getElementById('authError'),
  adminPanel: document.getElementById('adminPanel'),
  adminForm: document.getElementById('adminForm'),
  adminList: document.getElementById('adminList'),
  productId: document.getElementById('productId'),
  productName: document.getElementById('productName'),
  productSeries: document.getElementById('productSeries'),
  productDescription: document.getElementById('productDescription'),
  productPrice: document.getElementById('productPrice'),
  productImage: document.getElementById('productImage'),
  productImageFile: document.getElementById('productImageFile'),
  imagePreview: document.getElementById('imagePreview'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  logoutBtn: document.getElementById('logoutBtn')
};

async function isAdminLoggedIn() {
  const { data } = await supabase.auth.getSession();
  const email = data?.session?.user?.email;
  return email === ADMIN_EMAIL;
}

async function logout() {
  await supabase.auth.signOut();
  showAuth();
}

function showAuthError(message) {
  if (!elements.authError) return;
  elements.authError.textContent = message;
  elements.authError.classList.remove('hidden');
}

function clearAuthError() {
  if (!elements.authError) return;
  elements.authError.textContent = '';
  elements.authError.classList.add('hidden');
}

function handleAuthStateChange(event, session) {
  console.log('[Auth state change]', event, session);
  if (session?.user?.email === ADMIN_EMAIL) {
    showAdminPanel();
  } else {
    showAuth();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForActiveSession(maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      return data.session;
    }
    await sleep(200);
  }
  return null;
}

function parseImageValue(value) {
  if (!value || typeof value !== 'string') {
    return { src: '', fit: 'cover', position: 'center' };
  }

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
    // no-op: el valor es una URL simple
  }

  return { src: value, fit: 'cover', position: 'center' };
}

function buildImageValue(src, fit = 'cover', position = 'center') {
  return JSON.stringify({ src, fit, position });
}

function updateImagePreview() {
  const { src, fit, position } = parseImageValue(elements.productImage.value);
  if (!src) {
    elements.imagePreview.innerHTML = '<span class="preview-placeholder">No hay imagen seleccionada</span>';
    elements.imagePreview.style.background = 'rgba(255,255,255,0.04)';
    return;
  }

  elements.imagePreview.innerHTML = `
    <img src="${src}" alt="Vista previa del producto" style="object-fit:${fit}; object-position:${position};" />
  `;
  elements.imagePreview.style.background = 'transparent';
}

async function handleImageFileChange() {
  const file = elements.productImageFile.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const img = new Image();
    img.onload = () => {
      // Siempre abrir el editor de recorte
      initImageCropper(dataUrl, img.width, img.height);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// ─── IMAGE CROP STATE ───
let cropState = {
  image: null,
  canvas: null,
  ctx: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  frameSize: 0,
};

function initImageCropper(dataUrl, imgWidth, imgHeight) {
  const modal = document.getElementById('imageCropModal');
  const canvas = document.getElementById('cropCanvas');
  
  cropState.image = new Image();
  cropState.image.onload = () => {
    cropState.canvas = canvas;
    cropState.ctx = canvas.getContext('2d');
    modal.classList.remove('hidden');
    
    // Ajustar tamaño del canvas al contenedor una vez visible
    const container = canvas.parentElement;
    cropState.frameSize = container.offsetWidth;
    canvas.width = cropState.frameSize;
    canvas.height = cropState.frameSize;
    
    // Centrar imagen inicial
    const scale = Math.min(cropState.frameSize / imgWidth, cropState.frameSize / imgHeight);
    cropState.offsetX = (cropState.frameSize - imgWidth * scale) / 2;
    cropState.offsetY = (cropState.frameSize - imgHeight * scale) / 2;
    cropState.zoom = 1;
    
    drawCropFrame();
    setupCropControls();
  };
  cropState.image.src = dataUrl;
}

function drawCropFrame() {
  const ctx = cropState.ctx;
  const img = cropState.image;
  
  ctx.clearRect(0, 0, cropState.frameSize, cropState.frameSize);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cropState.frameSize, cropState.frameSize);
  
  const baseScale = Math.min(cropState.frameSize / img.width, cropState.frameSize / img.height);
  const scale = baseScale * cropState.zoom;
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Dibujar imagen escalada
  ctx.drawImage(
    img,
    cropState.offsetX,
    cropState.offsetY,
    scaledWidth,
    scaledHeight
  );
}

function setupCropControls() {
  const zoomSlider = document.getElementById('zoomSlider');
  const zoomValue = document.getElementById('zoomValue');
  const canvas = cropState.canvas;
  
  // Zoom control
  zoomSlider.addEventListener('input', (e) => {
    cropState.zoom = parseFloat(e.target.value);
    zoomValue.textContent = Math.round(cropState.zoom * 100) + '%';
    drawCropFrame();
  });
  
  // Drag control
  canvas.addEventListener('mousedown', startDrag);
  canvas.addEventListener('mousemove', moveDrag);
  canvas.addEventListener('mouseup', endDrag);
  canvas.addEventListener('mouseleave', endDrag);
  
  // Touch support
  canvas.addEventListener('touchstart', startDragTouch);
  canvas.addEventListener('touchmove', moveDragTouch);
  canvas.addEventListener('touchend', endDrag);
}

function startDrag(e) {
  cropState.isDragging = true;
  cropState.startX = e.clientX;
  cropState.startY = e.clientY;
}

function startDragTouch(e) {
  if (e.touches.length === 1) {
    cropState.isDragging = true;
    const touch = e.touches[0];
    cropState.startX = touch.clientX;
    cropState.startY = touch.clientY;
  }
}

function moveDrag(e) {
  if (!cropState.isDragging) return;
  
  const deltaX = e.clientX - cropState.startX;
  const deltaY = e.clientY - cropState.startY;
  
  updateImageOffset(deltaX, deltaY);
  
  cropState.startX = e.clientX;
  cropState.startY = e.clientY;
}

function moveDragTouch(e) {
  if (!cropState.isDragging || e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  const deltaX = touch.clientX - cropState.startX;
  const deltaY = touch.clientY - cropState.startY;
  
  updateImageOffset(deltaX, deltaY);
  
  cropState.startX = touch.clientX;
  cropState.startY = touch.clientY;
}

function updateImageOffset(deltaX, deltaY) {
  const img = cropState.image;
  const baseScale = Math.min(cropState.frameSize / img.width, cropState.frameSize / img.height);
  const scale = baseScale * cropState.zoom;
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Límites de desplazamiento
  const maxOffsetX = Math.max(0, (scaledWidth - cropState.frameSize) / 2) * 2;
  const maxOffsetY = Math.max(0, (scaledHeight - cropState.frameSize) / 2) * 2;
  
  cropState.offsetX = Math.min(
    Math.max(cropState.offsetX + deltaX, -maxOffsetX / 2),
    maxOffsetX / 2
  );
  
  cropState.offsetY = Math.min(
    Math.max(cropState.offsetY + deltaY, -maxOffsetY / 2),
    maxOffsetY / 2
  );
  
  drawCropFrame();
}

function endDrag() {
  cropState.isDragging = false;
}

function applyCrop() {
  // Tamaño final optimizado para la tienda (600x600px)
  const FINAL_SIZE = 600;
  
  const canvas = document.createElement('canvas');
  canvas.width = FINAL_SIZE;
  canvas.height = FINAL_SIZE;
  
  const ctx = canvas.getContext('2d');
  const img = cropState.image;
  
  const scale = (Math.min(cropState.frameSize / img.width, cropState.frameSize / img.height) * cropState.zoom);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Dibujar imagen recortada en canvas final
  ctx.drawImage(
    img,
    cropState.offsetX,
    cropState.offsetY,
    scaledWidth,
    scaledHeight
  );
  
  // Convertir a Data URL con compresión óptima
  const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
  
  elements.productImage.value = buildImageValue(croppedDataUrl, 'cover', 'center');
  updateImagePreview();
  
  closeCropModal();
}

function closeCropModal() {
  const modal = document.getElementById('imageCropModal');
  modal.classList.add('hidden');
  elements.productImageFile.value = '';
}


function showAuth() {
  elements.adminAuth.classList.remove('hidden');
  elements.adminPanel.classList.add('hidden');
  elements.authForm.reset();
  elements.adminForm.reset();
  updateImagePreview();
  clearAuthError();
}

function showAdminPanel() {
  elements.adminAuth.classList.add('hidden');
  elements.adminPanel.classList.remove('hidden');
  loadProducts();
}

async function loadProducts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    alert('Configura tus credenciales de Supabase en admin.js antes de usar el panel.');
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,name,series,description,price,image')
    .order('id', { ascending: true });

  if (error) {
    if (error.message?.toLowerCase().includes('permission denied')) {
      showAuthError('Permiso denegado en la tabla products. Revisa las políticas RLS en Supabase.');
    } else {
      alert('Error cargando productos: ' + error.message);
    }
    return;
  }

  renderAdminList(data || []);
}

function renderAdminList(products) {
  if (!elements.adminList) return;
  if (!products.length) {
    elements.adminList.innerHTML = '<div class="admin-item">No hay productos registrados.</div>';
    return;
  }

  elements.adminList.innerHTML = products.map(product => `
    <div class="admin-item" data-id="${product.id}">
      <div class="admin-item-info">
        <div class="admin-item-name">${product.name}</div>
        <div class="admin-item-meta">${product.series} · ${product.price}</div>
        <div class="admin-item-description">${product.description}</div>
      </div>
      <div class="admin-item-buttons">
        <button class="edit-btn" type="button" data-action="edit">Editar</button>
        <button class="delete-btn" type="button" data-action="delete">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function resetForm() {
  elements.productId.value = '';
  elements.adminForm.reset();
  elements.productImage.value = '';
  elements.productImageFile.value = '';
  updateImagePreview();
  elements.saveBtn.textContent = 'Guardar producto';
}

function fillForm(product) {
  const imageData = parseImageValue(product.image);

  elements.productId.value = product.id;
  elements.productName.value = product.name;
  elements.productSeries.value = product.series;
  elements.productDescription.value = product.description;
  elements.productPrice.value = product.price;
  elements.productImage.value = buildImageValue(imageData.src, 'cover', 'center');
  elements.productImageFile.value = '';
  updateImagePreview();
  elements.saveBtn.textContent = 'Actualizar producto';
}

async function saveProduct(event) {
  event.preventDefault();

  let session = await waitForActiveSession();
  if (!session) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('[saveProduct] current session after wait:', sessionData, sessionError);
    session = sessionData?.session;
  }

  if (!session) {
    showAuthError('No se detecta sesión activa. Ingresa de nuevo antes de guardar el producto.');
    return;
  }

  const id = elements.productId.value;
  const name = elements.productName.value.trim();
  const series = elements.productSeries.value.trim();
  const description = elements.productDescription.value.trim();
  const price = elements.productPrice.value.trim();
  const image = elements.productImage.value.trim();

  if (!name || !series || !description || !price || !image) {
    alert('Completa todos los campos y sube una imagen.');
    return;
  }

  if (id) {
    const { error } = await supabase
      .from(TABLE)
      .update({ name, series, description, price, image })
      .eq('id', id);

    if (error) {
      if (error.message?.toLowerCase().includes('permission denied')) {
        showAuthError('Permission denied en products. Revisa las políticas RLS de Supabase para admin.');
      } else {
        alert('Error actualizando: ' + error.message);
      }
      return;
    }

    alert('Producto actualizado correctamente.');
  } else {
    const { error } = await supabase
      .from(TABLE)
      .insert([{ name, series, description, price, image }]);

    if (error) {
      if (error.message?.toLowerCase().includes('permission denied')) {
        showAuthError('Permission denied en products. Revisa las políticas RLS de Supabase para admin.');
      } else {
        alert('Error guardando producto: ' + error.message);
      }
      return;
    }

    alert('Producto agregado correctamente.');
  }

  resetForm();
  loadProducts();
}

async function handleAdminClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const action = button.dataset.action;
  const item = button.closest('.admin-item');
  if (!item) return;
  const id = item.dataset.id;

  if (action === 'edit') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id,name,series,description,price,image')
      .eq('id', id)
      .single();

    if (error) {
      alert('Error cargando producto: ' + error.message);
      return;
    }

    fillForm(data);
  }

  if (action === 'delete') {
    const confirmed = confirm('¿Seguro que deseas eliminar este producto?');
    if (!confirmed) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error eliminando producto: ' + error.message);
      return;
    }

    alert('Producto eliminado.');
    loadProducts();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthError();

  const email = elements.adminEmail.value.trim();
  const password = elements.adminPassword.value.trim();

  if (!email || !password) {
    showAuthError('Ingresa correo y contraseña.');
    return;
  }

  if (email !== ADMIN_EMAIL) {
    showAuthError('Usa el correo administrador correcto.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('Supabase login result:', { data, error });
    if (error) {
      showAuthError('Error de inicio de sesión: ' + error.message + '. Si creaste la cuenta ahora, revisa tu correo y confirma el registro.');
      console.error('Supabase login error:', error);
      return;
    }

    const session = await supabase.auth.getSession();
    console.log('Session after login:', session);

    const userEmail = session?.data?.session?.user?.email;
    if (userEmail !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      showAuthError('Este correo no está autorizado para acceder al panel.');
      return;
    }

    showAdminPanel();
  } catch (err) {
    showAuthError('Error inesperado al iniciar sesión. Revisa la consola.');
    console.error('Unexpected login error:', err);
  }
}

async function createAdminAccount() {
  clearAuthError();

  const email = elements.adminEmail.value.trim();
  const password = elements.adminPassword.value.trim();

  if (!email || !password) {
    showAuthError('Ingresa correo y contraseña para crear la cuenta.');
    return;
  }

  if (email !== ADMIN_EMAIL) {
    showAuthError('Solo se puede crear la cuenta admin con el correo autorizado.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log('Supabase signUp result:', { data, error });
    if (error) {
      showAuthError('No se pudo crear la cuenta: ' + error.message);
      console.error('Supabase signUp error:', error);
      return;
    }

    if (data?.user) {
      showAuthError('Cuenta creada. Revisa el correo y confirma el registro si es necesario antes de iniciar sesión.');
      return;
    }

    showAuthError('Cuenta solicitada. Revisa tu correo para confirmar si es necesario.');
  } catch (err) {
    showAuthError('Error inesperado al crear cuenta. Revisa la consola.');
    console.error('Unexpected signUp error:', err);
  }
}

async function init() {
  elements.authForm.addEventListener('submit', handleLogin);
  elements.createAdminBtn.addEventListener('click', createAdminAccount);
  elements.adminForm.addEventListener('submit', saveProduct);
  elements.cancelBtn.addEventListener('click', resetForm);
  elements.logoutBtn.addEventListener('click', logout);
  elements.adminList.addEventListener('click', handleAdminClick);
  elements.productImageFile.addEventListener('change', handleImageFileChange);

  // Crop modal controls
  document.getElementById('cropCloseBtn').addEventListener('click', closeCropModal);
  document.getElementById('cropCancelBtn').addEventListener('click', closeCropModal);
  document.getElementById('cropConfirmBtn').addEventListener('click', applyCrop);

  supabase.auth.onAuthStateChange(handleAuthStateChange);

  if (await isAdminLoggedIn()) {
    showAdminPanel();
  } else {
    showAuth();
  }
}

window.addEventListener('DOMContentLoaded', init);
