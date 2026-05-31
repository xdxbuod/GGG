const {
  createDocument,
  handleApiError,
  listCollection,
  methodNotAllowed,
  readJson,
  sendJson
} = require("../_lib/adminApi");

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return methodNotAllowed(res, ["GET", "POST"]);

  try {
    if (req.method === "POST") {
      const body = await readJson(req);
      const data = await createDocument("produtos", {
        ...body,
        dataCriacao: body.dataCriacao || new Date().toISOString()
      });
      return sendJson(res, 201, {
        success: true,
        collection: "produtos",
        data
      });
    }

    const data = await listCollection("produtos", ["dataCriacao", "createdAt", "updatedAt"]);
    return sendJson(res, 200, {
      success: true,
      collection: "produtos",
      count: data.length,
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
