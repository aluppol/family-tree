const { transactional } = require("../utils");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(transactional(
    `CREATE TABLE IF NOT EXISTS test (
        id SERIAL PRIMARY KEY,
        col1 VARCHAR(10),
        col2 BIGINT UNIQUE NOT NULL
    );`,
  ));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.raw(transactional(
        `DROP TABLE IF EXISTS test;`,
      ));
};
