const {
  getRouteParam,
  handleApiError,
  methodNotAllowed,
  readJson,
  sendJson,
  updateDocument
} = require("../../_lib/adminApi");

module.exports = async function handler(req, res) {
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);

  const id = getRouteParam(req, "id");
  if (!id) {
    return sendJson(res, 400, {
      success: false,
      message: "ID da notificacao nao informado."
    });
  }

  try {
    const body = await readJson(req);
    const data = await updateDocument("notifications", id, {
      ...body,
      updatedAt: body.updatedAt || new Date().toISOString()
    });
    sendJson(res, 200, {
      success: true,
      collection: "notifications",
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
