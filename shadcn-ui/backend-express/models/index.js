const sequelize = require('../config/database');
const User = require('./User');
const SOPDocument = require('./SOPDocument');
const SOPRevision = require('./SOPRevision');
const ActivityLog = require('./ActivityLog');

module.exports = { sequelize, User, SOPDocument, SOPRevision, ActivityLog };
