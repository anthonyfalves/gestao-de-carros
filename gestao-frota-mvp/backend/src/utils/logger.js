export const logAction = async (userId, action, metadata, AuditLog) => {
  try {
    await AuditLog.create({ userId, action, metadata });
  } catch (e) {
    console.error('[AUDIT] Failed to log action', e?.message);
  }
};
