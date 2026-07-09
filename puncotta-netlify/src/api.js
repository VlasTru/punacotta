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
  getSavedAddresses: ()             => req('GET',  '/addresses'),

  // Products
  getProducts:       ()     => req('GET',    '/products'),
  getProductLookups: ()     => req('GET',    '/products/lookups'),
  getProductUsage:   (ids)  => req('GET',    `/products/usage/${ids.join(',')}`),
  createProduct:     (data) => req('POST',   '/products', data),
  updateProduct:     (pid, data) => req('PATCH', `/products/${pid}`, data),
  deleteProducts:    (ids, cascade_recipes) => req('DELETE', '/products', { ids, cascade_recipes }),

  // Suppliers
  getSuppliers:      ()          => req('GET',    '/suppliers'),
  getSupplier:       (sid)       => req('GET',    `/suppliers/${sid}`),
  createSupplier:    (data)      => req('POST',   '/suppliers', data),
  updateSupplier:    (sid, data) => req('PATCH',  `/suppliers/${sid}`, data),
  deleteSupplier:    (sid)       => req('DELETE', `/suppliers/${sid}`),
  getSupplierProducts:   (sid)       => req('GET',    `/suppliers/${sid}/products`),
  linkSupplierProduct:   (sid, data) => req('POST',   `/suppliers/${sid}/products`, data),
  unlinkSupplierProduct: (sid, psid) => req('DELETE', `/suppliers/${sid}/products/${psid}`),

  // Staff
  getStaff:       ()          => req('GET',    '/staff'),
  createEmployee: (data)      => req('POST',   '/staff', data),
  updateEmployee: (uid, data) => req('PATCH',  `/staff/${uid}`, data),
  deleteEmployees:(ids)       => req('DELETE', '/staff', { ids }),
  // Roles
  getRoles:       ()          => req('GET',    '/roles'),
  createRole:     (data)      => req('POST',   '/roles', data),
  updateRole:     (rid, data) => req('PATCH',  `/roles/${rid}`, data),
  deleteRoles:    (ids)       => req('DELETE', '/roles', { ids }),
  // Skills
  getSkills:      ()          => req('GET',    '/skills'),
  createSkill:    (data)      => req('POST',   '/skills', data),
  deleteSkills:   (ids)       => req('DELETE', '/skills', { ids }),
  // Embed settings
  getEmbedSettings:    ()     => req('GET',   '/embed/settings'),
  updateEmbedSettings: (data) => req('PATCH', '/embed/settings', data),
  rotateEmbedKey:      ()     => req('POST',  '/embed/settings/rotate-key'),
  testEmbedConnect:    ()     => req('POST',  '/embed/settings/test'),
  getStock:    () => req('GET',  '/stock'),
  getForecast: () => req('GET',  '/forecast'),
  runForecast: () => req('POST', '/forecast'),
  getProcurement:         ()           => req('GET',   '/procurement'),
  patchProductExpiry:     (pid,data)   => req('PATCH', `/procurement/${pid}`, data),
  updateOrderItems:       (oid,items)  => req('PATCH', `/orders/${oid}/items`, { items }),
  getSupplierOrders:      ()           => req('GET',   '/procurement/orders'),
  getSupplierOrder:       (soid)       => req('GET',   `/procurement/orders/${soid}`),
  createSupplierOrder:    (data)       => req('POST',  '/procurement/orders', data),
  createDraftOrders:      ()           => req('POST', '/procurement/orders/draft'),
  // Reports
  getSalesReport:  (period) => req('GET', `/reports/sales/${period}`),
  getAbcReport:    ()       => req('GET', '/reports/abc'),
  updateSupplierOrder:    (soid,data)  => req('PATCH', `/procurement/orders/${soid}`, data),
  submitSupplierOrder:    (soid)       => req('POST',  `/procurement/orders/${soid}/submit`),
  cancelSupplierOrder:    (soid)       => req('POST',   `/procurement/orders/${soid}/cancel`),
  deleteSupplierOrder:    (soid)       => req('DELETE', `/procurement/orders/${soid}`),
  acceptSupplierOrder:    (soid,data)  => req('POST',  `/procurement/orders/${soid}/accept`, data),
  getSupplierOrderPDF:    (soid,type)  => req('GET',   `/procurement/orders/${soid}/pdf${type==='recon'?'/recon':''}`),

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
  duplicateMenu:     (mid)       => req('POST',   `/menus/${mid}/duplicate`),
  deleteMenu:        (mid)       => req('DELETE', `/menus/${mid}`),
  addMenuRecipes:    (mid, ids)  => req('POST',   `/menus/${mid}/recipes`, { recipe_ids: ids }),
  removeMenuRecipes: (mid, ids)  => req('DELETE', `/menus/${mid}/recipes`, { recipe_ids: ids }),

  // Schedule
  getSchedule:  ()     => req('GET',   '/schedule'),
  saveSchedule: (data) => req('PUT',   '/schedule', data),

  // Customers
  searchCustomers: (q) => req('GET', `/customers/${encodeURIComponent(q)}`),

  // Orders
  getOrders:       ()     => req('GET',   '/orders'),
  placeOrder:      (data) => req('POST',  '/orders', data),
  advanceOrder:    (oid)  => req('PATCH', `/orders/${oid}/advance`),
  declineOrder:    (oid)  => req('PATCH', `/orders/${oid}/decline`),
  cancelOrder:     (oid)  => req('PATCH', `/orders/${oid}/cancel`),
  confirmDelivery: (oid)  => req('PATCH', `/orders/${oid}/confirm-delivery`),
}
