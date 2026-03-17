// src/api.js
const BASE = '/.netlify/functions/api'

function getToken() { return localStorage.getItem('token') }

async function req(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }
  const res = await fetch(BASE + path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// Multipart upload (image blob)
async function upload(path, formData) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  // Auth
  login:           (email, password) => req('POST', '/auth/login',   { email, password }),
  register:        (form)            => req('POST', '/auth/register', form),
  forgot:          (email)           => req('POST', '/auth/forgot',   { email }),
  reset:           (token, password) => req('POST', '/auth/reset',    { token, password }),
  verify:          (token)           => req('POST', '/auth/verify',   { token }),
  me:              ()                => req('GET',  '/auth/me'),

  // Products
  getProducts:       ()     => req('GET',    '/products'),
  getProductLookups: ()     => req('GET',    '/products/lookups'),
  createProduct:     (data) => req('POST',   '/products', data),
  deleteProducts:    (ids)  => req('DELETE', '/products', { ids }),

  // Recipes
  getRecipes:          ()          => req('GET',    '/recipes'),
  getAvailableRecipes: ()          => req('GET',    '/recipes/available'),
  getRecipeLookups:    ()          => req('GET',    '/recipes/lookups'),
  createRecipe:        (data)      => req('POST',   '/recipes', data),
  updateRecipe:        (rid, data) => req('PUT',    `/recipes/${rid}`, data),
  patchRecipe:         (rid, data) => req('PATCH',  `/recipes/${rid}`, data),
  deleteRecipes:       (ids)       => req('DELETE', '/recipes', { ids }),

  // Images
  uploadImage: (formData)  => upload('/images/upload', formData),
  removeImage: (rid)       => req('DELETE', `/images/remove/${rid}`),

  // Menus
  getMenus:          ()          => req('GET',    '/menus'),
  getMenu:           (mid)       => req('GET',    `/menus/${mid}`),
  createMenu:        (data)      => req('POST',   '/menus', data),
  patchMenu:         (mid, data) => req('PATCH',  `/menus/${mid}`, data),
  addMenuRecipes:    (mid, ids)  => req('POST',   `/menus/${mid}/recipes`, { recipe_ids: ids }),
  removeMenuRecipes: (mid, ids)  => req('DELETE', `/menus/${mid}/recipes`, { recipe_ids: ids }),

  // Orders
  getOrders:       ()     => req('GET',   '/orders'),
  placeOrder:      (data) => req('POST',  '/orders', data),
  advanceOrder:    (oid)  => req('PATCH', `/orders/${oid}/advance`),
  declineOrder:    (oid)  => req('PATCH', `/orders/${oid}/decline`),
  cancelOrder:     (oid)  => req('PATCH', `/orders/${oid}/cancel`),
  confirmDelivery: (oid)  => req('PATCH', `/orders/${oid}/confirm-delivery`),
}
