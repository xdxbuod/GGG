const {
  deleteDocument,
  getRouteParam,
  handleApiError,
  methodNotAllowed,
  readJson,
  sendJson,
  updateDocument
} = require("../../_lib/adminApi");

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
