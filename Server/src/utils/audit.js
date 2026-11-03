const AuditLog = require("../models/AuditLog");

exports.logAction = (userId, action, entity, entityId, details = null, db) =>
  AuditLog.create(
    { user_id: userId, action, entity, entity_id: entityId, details },
    db,
  );
