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
      message: "ID do produto nao informado."
    });
  }

  try {
    if (req.method === "DELETE") {
      const data = await deleteDocument("produtos", id);
      return sendJson(res, 200, {
        success: true,
        collection: "produtos",
        data
      });
    }

    const body = await readJson(req);
    const data = await updateDocument("produtos", id, {
      ...body,
      updatedAt: body.updatedAt || new Date().toISOString()
    });
    return sendJson(res, 200, {
      success: true,
      collection: "produtos",
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
