const { getDb } = require("./firebaseAdmin");

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, {
    success: false,
    message: "Metodo nao permitido."
  });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializeFirestoreValue(nested)])
    );
  }
  return value;
}

function docToData(doc) {
  return {
    id: doc.id,
    firestoreId: doc.id,
    ...serializeFirestoreValue(doc.data())
  };
}

function getDateWeight(item, fields) {
  for (const field of fields) {
    const value = item[field];
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return 0;
}

function sortByDateDesc(items, fields) {
  return items.sort((a, b) => getDateWeight(b, fields) - getDateWeight(a, fields));
}

async function listCollection(collectionName, sortFields = ["createdAt", "dataCriacao", "updatedAt"]) {
  const snapshot = await getDb().collection(collectionName).get();
  return sortByDateDesc(snapshot.docs.map(docToData), sortFields);
}

function getDocumentKey(item) {
  return String(
    item.orderId ||
    item.orderNumber ||
    item.idPedido ||
    item.checkoutId ||
    item.paymentId ||
    item.transactionId ||
    item.id ||
    ""
  );
}

function isEmptyMergeValue(value) {
  return value === undefined || value === null || value === "";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function getValueAtPath(item, path) {
  return path.split(".").reduce((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    return current[key];
  }, item);
}

function addDocumentKey(keys, value) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "object") return;
  const key = String(value).trim();
  if (key) keys.add(key);
}

function getDocumentKeys(item) {
  const fields = [
    "id",
    "firestoreId",
    "orderId",
    "orderNumber",
    "idPedido",
    "pedidoId",
    "checkoutId",
    "checkout_id",
    "paymentId",
    "payment_id",
    "transactionId",
    "transaction_id",
    "transaction_nsu",
    "invoiceId",
    "invoice_id",
    "invoiceSlug",
    "invoice_slug",
    "metadata.orderId",
    "metadata.orderNumber",
    "metadata.idPedido",
    "metadata.pedidoId",
    "metadata.checkoutId",
    "metadata.paymentId",
    "metadata.transactionId",
    "paymentData.orderId",
    "checkoutData.orderId",
    "webhookData.orderId",
    "infinitePay.orderId"
  ];
  const keys = new Set();
  fields.forEach((field) => addDocumentKey(keys, getValueAtPath(item, field)));
  return Array.from(keys);
}

function mergeDocumentData(current, incoming) {
  const merged = { ...current };

  Object.entries(incoming).forEach(([key, value]) => {
    const existing = merged[key];

    if (isEmptyMergeValue(value)) return;
    if (isPlainObject(existing) && isPlainObject(value)) {
      merged[key] = mergeDocumentData(existing, value);
      return;
    }
    if (Array.isArray(existing) && existing.length > 0 && Array.isArray(value) && value.length === 0) return;
    merged[key] = value;
  });

  return merged;
}

function mergeDocumentLists(lists, sortFields = ["createdAt", "dataCriacao", "updatedAt"]) {
  const merged = new Map();
  const aliases = new Map();

  lists.flat().forEach((item) => {
    const keys = getDocumentKeys(item);
    const key = keys.find((candidate) => aliases.has(candidate)) || getDocumentKey(item);
    if (!key) return;
    const primaryKey = aliases.get(key) || key;
    const current = merged.get(primaryKey);
    const next = current ? mergeDocumentData(current, item) : item;

    merged.set(primaryKey, next);
    getDocumentKeys(next).concat(keys).forEach((candidate) => {
      aliases.set(candidate, primaryKey);
    });
  });

  return sortByDateDesc(Array.from(merged.values()), sortFields);
}

async function createDocument(collectionName, data) {
  const ref = await getDb().collection(collectionName).add(data);
  const saved = await ref.get();
  return docToData(saved);
}

async function updateDocument(collectionName, id, data) {
  const ref = getDb().collection(collectionName).doc(id);
  await ref.update(data);
  const updated = await ref.get();
  return docToData(updated);
}

async function deleteDocument(collectionName, id) {
  await getDb().collection(collectionName).doc(id).delete();
  return { id };
}

function getRouteParam(req, name) {
  const value = req.query && req.query[name];
  if (Array.isArray(value)) return value[0];
  if (value) return value;

  const pathname = new URL(req.url, "http://localhost").pathname;
  const parts = pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "");
}

function handleApiError(res, error) {
  console.error("[ADMIN API]", error);
  sendJson(res, 500, {
    success: false,
    message: "Erro interno ao carregar dados do painel."
  });
}

module.exports = {
  createDocument,
  deleteDocument,
  docToData,
  getRouteParam,
  handleApiError,
  listCollection,
  mergeDocumentLists,
  methodNotAllowed,
  readJson,
  sendJson,
  sortByDateDesc,
  updateDocument
};
