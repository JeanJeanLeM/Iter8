const mongoose = require('mongoose');
const { createModels } = require('@librechat/data-schemas');

// Register all models (Recipe, Conversation, etc.) before any module that reads mongoose.models
createModels(mongoose);

const { connectDb } = require('./connect');
const indexSync = require('./indexSync');

module.exports = { connectDb, indexSync };
