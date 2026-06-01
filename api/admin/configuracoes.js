const {
  handleApiError,
  listCollection,
  methodNotAllowed,
  sendJson
} = require("../_lib/adminApi");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const data = await listCollection("configuracoes", ["updatedAt", "createdAt", "dataCriacao"]);
    sendJson(res, 200, {
      success: true,
      collection: "configuracoes",
      count: data.length,
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
