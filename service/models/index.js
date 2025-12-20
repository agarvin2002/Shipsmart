/* global logger */
const fs = require('fs');
const path = require('path');
const cls = require('cls-hooked');
const Sequelize = require('sequelize');

const basename = path.basename(module.filename);
const config = require('@shipsmart/env');

const db = {};

const postgresConf = config.get('postgres');

postgresConf.define = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const namespace = cls.createNamespace('shipsmart_sequel_trans');
Sequelize.useCLS(namespace);

postgresConf.logging = (msg) => {
  logger.info(msg);
};
const sequelize = new Sequelize(
  postgresConf.database, postgresConf.username, postgresConf.password, postgresConf,
);

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0)
    && (file !== basename)
    && (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.namespace = namespace;

module.exports = db;
