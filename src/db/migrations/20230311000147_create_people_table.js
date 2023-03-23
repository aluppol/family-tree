/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.raw(`
        CREATE SCHEMA IF NOT EXISTS src;

        CREATE TABLE src."People" (
            id BIGSERIAL PRIMARY KEY,

            "name" VARCHAR(255) NOT NULL,
            "familyName" VARCHAR(255) NOT NULL,
            "birthday" TIMESTAMP NOT NULL,
            "fatherId" BIGINT,
            "motherId" BIGINT,

            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP,
            "deletedAt" TIMESTAMP,

            CONSTRAINT fk_src_people_fatherid_people_id FOREIGN KEY ("fatherId") REFERENCES src."People"(id) ON DELETE SET NULL,
            CONSTRAINT fk_src_people_motherid_people_id FOREIGN KEY ("motherId") REFERENCES src."People"(id) ON DELETE SET NULL
        );
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.raw(`
        DROP TABLE src."People";
        DROP SCHEMA IF EXISTS src;
    `);
};
