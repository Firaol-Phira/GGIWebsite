const pool = require("../config/db");

exports.create = ({ user_id, action, entity, entity_id, details }, db = pool) =>
  db.query(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)",
    [user_id, action, entity, entity_id, details],
  );
