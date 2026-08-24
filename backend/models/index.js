const sequelize = require('../config/database');
const User = require('./User');
const SOPDocument = require('./SOPDocument');
const SOPRevision = require('./SOPRevision');
const ActivityLog = require('./ActivityLog');

// Asosiasi SOPDocument <-> SOPRevision
SOPDocument.hasMany(SOPRevision, { foreignKey: 'sop_id', as: 'revisions', onDelete: 'CASCADE' });
SOPRevision.belongsTo(SOPDocument, { foreignKey: 'sop_id', as: 'sop' });

// Asosiasi SOPDocument <-> User
SOPDocument.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
SOPDocument.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
SOPDocument.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Asosiasi SOPRevision <-> User
SOPRevision.belongsTo(User, { foreignKey: 'revised_by', as: 'reviser' });
SOPRevision.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// Asosiasi ActivityLog <-> User & SOPDocument
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ActivityLog.belongsTo(SOPDocument, { foreignKey: 'sop_id', as: 'sop' });

module.exports = { sequelize, User, SOPDocument, SOPRevision, ActivityLog };

