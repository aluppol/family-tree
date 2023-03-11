/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.raw(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE SCHEMA IF NOT EXISTS src;

        CREATE TABLE auth."Users" (
            id BIGSERIAL PRIMARY KEY,

            "cognitoId" VARCHAR(100) NOT NULL,
            "personId" BIGINT,

            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP,
            "deletedAt" TIMESTAMP
        );

        CREATE TABLE src."People" (
            id BIGSERIAL PRIMARY KEY,

            "name" VARCHAR(255) NOT NULL,
            "familyName" VARCHAR(255) NOT NULL,
            "birthday" TIMESTAMP NOT NULL,
            "fatherId" BIGINT,
            "motherId" BIGINT,

            "createdBy" BIGINT NOT NULL,
            "updatedBy" BIGINT,
            "deletedBy" BIGINT,

            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP,
            "deletedAt" TIMESTAMP,

            CONSTRAINT fk_src_people_fatherid_people_id FOREIGN KEY ("fatherId") REFERENCES src."People"(id) ON DELETE SET NULL,
            CONSTRAINT fk_src_people_motherid_people_id FOREIGN KEY ("motherId") REFERENCES src."People"(id) ON DELETE SET NULL,
            CONSTRAINT fk_src_people_createdby_users_id FOREIGN KEY ("createdBy") REFERENCES auth."Users"(id) ON DELETE SET NULL,
            CONSTRAINT fk_src_people_updatedby_users_id FOREIGN KEY ("updatedBy") REFERENCES auth."Users"(id) ON DELETE SET NULL,
            CONSTRAINT fk_src_people_deletedby_users_id FOREIGN KEY ("deletedBy") REFERENCES auth."Users"(id) ON DELETE SET NULL
        );

        ALTER TABLE auth."Users" ADD CONSTRAINT fk_auth_users_personid_people_id FOREIGN KEY ("personId") REFERENCES src."People"(id) ON DELETE SET NULL;
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.raw(`
        ALTER TABLE auth."Users" DROP CONSTRAINT fk_auth_users_personid_people_id;
        DROP TABLE src."People";
        DROP TABLE auth."Users";
        DROP SCHEMA IF EXISTS src;
        DROP SCHEMA IF EXISTS auth;
    `);
};
