const pool = require("../config/db");

// conn is optional: pass a transaction connection when inside one
exports.logAction = (
  userId,
  action,
  entity,
  entityId,
  details = null,
  conn = pool,
) =>
  conn.query(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)",
    [userId, action, entity, entityId, details],
  );
