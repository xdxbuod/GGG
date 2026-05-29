const {
  handleApiError,
  listCollection,
  methodNotAllowed,
  sendJson
} = require("../_lib/adminApi");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const data = await listCollection("notifications", ["createdAt", "updatedAt"]);
    sendJson(res, 200, {
      success: true,
      collection: "notifications",
      count: data.length,
      data
    });
  } catch (error) {
    handleApiError(res, error);
  }
};
