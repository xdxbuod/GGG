const {
  deleteDocument,
  getRouteParam,
  handleApiError,
  methodNotAllowed,
  readJson,
  sendJson,
  updateDocument
} = require("../../_lib/adminApi");
const { getDb } = require("../../_lib/firebaseAdmin");

function normalizeStatus(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
}

function isPaidOrder(order) {
  if (!order) return false;
  if (order.paid === true) return true;
  const normalized = normalizeStatus(order.paymentStatus || order.statusPagamento || order.statusPedido || order.orderStatus || order.pagamentoConfirmado || order.paymentConfirmed);
  return ["paid", "pago", "aprovado", "pagamento_aprovado", "pagamento_confirmado"].includes(normalized);
}

function canDeleteOrder(order) {
  if (!order) return true;
  if (isPaidOrder(order)) return true;

  const normalized = normalizeStatus(order.statusPedido || order.orderStatus || order.deliveryStatus || order.statusPagamento || order.paymentStatus);
  const deletable = new Set(["finalizado", "concluido", "cancelado", "entregue", "pago", "aprovado", "pagamento_aprovado", "pagamento_confirmado", "reembolsado"]);
  return deletable.has(normalized);
}

module.exports = async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method)) return methodNotAllowed(res, ["PATCH", "DELETE"]);

  const id = getRouteParam(req, "id");
  if (!id) {
    return sendJson(res, 400, {
      success: false,
      message: "ID do pedido nao informado."
    });
  }

  try {
    if (req.method === "DELETE") {
      const orderDoc = await getDb().collection("pedidos").doc(id).get();
      const orderData = orderDoc.exists ? orderDoc.data() : null;
      if (orderData && !canDeleteOrder(orderData)) {
        return sendJson(res, 400, {
          success: false,
          message: "Pedido nao pode ser excluido ate ser finalizado, cancelado ou pago."
        });
      }

      const data = await deleteDocument("pedidos", id);
      deleteDocument("orders", id).catch(() => null);
      return sendJson(res, 200, {
        success: true,
        collection: "pedidos",
        data
      });
    }

    const body = await readJson(req);
    const update = {
      ...body,
      updatedAt: body.updatedAt || new Date().toISOString()
    };
    const data = await updateDocument("pedidos", id, update);
    updateDocument("orders", id, update).catch(() => null);
    return sendJson(res, 200, {
      success: true,
      collection: "pedidos",
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
