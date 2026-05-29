const {
  handleApiError,
  listCollection,
  mergeDocumentLists,
  methodNotAllowed,
  sendJson
} = require("../_lib/adminApi");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sortFields = ["createdAt", "dataCriacao", "createdAtIso", "paidAt", "updatedAt"];
    const [pedidos, orders] = await Promise.all([
      listCollection("pedidos", sortFields),
      listCollection("orders", sortFields)
    ]);
    const data = mergeDocumentLists([pedidos, orders], sortFields);
    sendJson(res, 200, {
      success: true,
      collections: ["pedidos", "orders"],
      count: data.length,
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
