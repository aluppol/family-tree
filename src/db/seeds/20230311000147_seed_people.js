/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('src.People').del();
  await knex('src.People').insert([
    {
      id: 1,
      name: 'Yurii',
      familyName: 'Luppol',
      birthday: '1971-09-25T07:00:00.000Z',
    },
    {
      id: 2,
      name: 'Olena',
      familyName: 'Luppol',
      birthday: '1972-05-24T07:00:00.000Z',
    },
    {
      id: 3,
      name: 'Albert',
      familyName: 'Luppol',
      birthday: '1995-06-20T07:00:00.000Z',
      fatherId: 1,
      motherId: 2,
    },
  ]);
};
