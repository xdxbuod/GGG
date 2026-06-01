const { getDb } = require("../_lib/firebaseAdmin");
const {
  docToData,
  handleApiError,
  methodNotAllowed,
  sendJson,
  sortByDateDesc
} = require("../_lib/adminApi");

const ORDER_COLLECTIONS = ["pedidos", "orders"];
const RELATED_COLLECTIONS = [
  "payments",
  "pagamentos",
  "checkout",
  "checkouts",
  "webhookLogs",
  "logs",
  "orderLogs",
  "notifications"
];

const SORT_FIELDS = ["createdAt", "dataCriacao", "createdAtIso", "paidAt", "updatedAt", "timestamp"];
const MAX_QUERY_IDENTIFIERS = 30;

const IDENTIFIER_FIELDS = [
  "id",
  "firestoreId",
  "orderId",
  "idPedido",
  "pedidoId",
  "orderNumber",
  "numeroPedido",
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
  "externalReference",
  "external_reference",
  "reference",
  "referenceId",
  "reference_id",
  "metadata.orderId",
  "metadata.idPedido",
  "metadata.pedidoId",
  "metadata.orderNumber",
  "metadata.checkoutId",
  "metadata.paymentId",
  "metadata.transactionId",
  "metadata.invoiceId",
  "paymentData.orderId",
  "paymentData.idPedido",
  "paymentData.checkoutId",
  "paymentData.paymentId",
  "paymentData.transactionId",
  "checkoutData.orderId",
  "checkoutData.idPedido",
  "checkoutData.checkoutId",
  "webhookData.orderId",
  "webhookData.idPedido",
  "webhookData.checkoutId",
  "webhookData.paymentId",
  "gatewayResponse.orderId",
  "gatewayResponse.checkoutId",
  "gatewayResponse.paymentId",
  "gatewayResponse.invoiceId",
  "infinitePay.orderId",
  "infinitePay.checkoutId",
  "infinitePay.paymentId",
  "payload.orderId",
  "payload.idPedido",
  "payload.checkoutId",
  "payload.paymentId",
  "payload.data.orderId",
  "payload.data.idPedido",
  "payload.data.checkoutId",
  "payload.data.paymentId",
  "payload.data.metadata.orderId",
  "payload.data.metadata.idPedido",
  "data.orderId",
  "data.idPedido",
  "data.checkoutId",
  "data.paymentId",
  "data.metadata.orderId",
  "event.data.orderId",
  "event.data.idPedido",
  "event.data.checkoutId",
  "event.data.paymentId",
  "event.data.object.metadata.orderId",
  "event.data.object.metadata.idPedido",
  "event.data.object.metadata.checkoutId",
  "event.data.object.metadata.paymentId"
];

function getQueryParam(req, name) {
  const value = req.query && req.query[name];
  if (Array.isArray(value)) return value[0];
  if (value) return value;
  return new URL(req.url, "http://localhost").searchParams.get(name) || "";
}

function getValueAtPath(item, path) {
  return path.split(".").reduce((current, key) => {
    if (current == null || typeof current !== "object") return undefined;
    return current[key];
  }, item);
}

function addIdentifier(target, value) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "object") return;

  const text = String(value).trim();
  if (!text) return;

  target.add(text);
  if (/^-?\d+(\.\d+)?$/.test(text)) target.add(Number(text));
}

function collectIdentifiers(target, item) {
  IDENTIFIER_FIELDS.forEach((field) => addIdentifier(target, getValueAtPath(item, field)));
}

function isSafeDocumentId(value) {
  return typeof value === "string" && value.trim() && !value.includes("/");
}

function getDedupeKey(collectionName, item) {
  return `${collectionName}/${item.firestoreId || item.id || JSON.stringify(item)}`;
}

async function getDocumentById(collectionName, id) {
  if (!isSafeDocumentId(id)) return null;
  const doc = await getDb().collection(collectionName).doc(id).get();
  return doc.exists ? docToData(doc) : null;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function queryByFieldValues(collectionName, field, values) {
  if (values.length === 0) return [];
  const query = values.length === 1
    ? getDb().collection(collectionName).where(field, "==", values[0])
    : getDb().collection(collectionName).where(field, "in", values);
  const snapshot = await query.get();
  return snapshot.docs.map(docToData);
}

async function runBatched(tasks, size = 12) {
  const results = [];
  const failures = [];

  for (let index = 0; index < tasks.length; index += size) {
    const batch = tasks.slice(index, index + size);
    const settled = await Promise.allSettled(batch.map((task) => task()));
    settled.forEach((result) => {
      if (result.status === "fulfilled") results.push(result.value);
      else failures.push(result.reason);
    });
  }

  if (tasks.length > 0 && failures.length === tasks.length) {
    throw failures[0];
  }

  return results.flat().filter(Boolean);
}

async function findRelatedDocuments(collectionName, identifiers) {
  const identifierList = Array.from(identifiers)
    .filter((value) => value !== undefined && value !== null && value !== "")
    .slice(0, MAX_QUERY_IDENTIFIERS);
  const results = new Map();

  const tasks = [];
  identifierList.forEach((identifier) => {
    if (isSafeDocumentId(identifier)) {
      tasks.push(() => getDocumentById(collectionName, identifier));
    }
  });

  IDENTIFIER_FIELDS.forEach((field) => {
    chunk(identifierList, 30).forEach((values) => {
      tasks.push(() => queryByFieldValues(collectionName, field, values));
    });
  });

  const docs = await runBatched(tasks);
  docs.forEach((doc) => {
    if (!doc) return;
    results.set(getDedupeKey(collectionName, doc), doc);
  });

  return sortByDateDesc(Array.from(results.values()), SORT_FIELDS);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const orderId = getQueryParam(req, "orderId").trim();
  if (!orderId) {
    return sendJson(res, 400, {
      success: false,
      message: "orderId nao informado."
    });
  }

  try {
    const identifiers = new Set();
    addIdentifier(identifiers, orderId);

    const orderLists = await Promise.all(
      ORDER_COLLECTIONS.map((collectionName) => findRelatedDocuments(collectionName, identifiers))
    );
    const orders = sortByDateDesc(orderLists.flat(), SORT_FIELDS);
    orders.forEach((order) => collectIdentifiers(identifiers, order));

    const relatedEntries = await Promise.all(
      RELATED_COLLECTIONS.map(async (collectionName) => {
        const docs = await findRelatedDocuments(collectionName, identifiers);
        return [collectionName, docs];
      })
    );

    const related = Object.fromEntries(relatedEntries);
    const totalCount = Object.values(related).reduce((sum, docs) => sum + docs.length, 0);

    sendJson(res, 200, {
      success: true,
      orderId,
      identifiers: Array.from(identifiers).map((value) => String(value)),
      orders,
      totalCount,
      ...related
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
