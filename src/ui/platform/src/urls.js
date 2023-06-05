export const URLS = {
    login: '/login',
    register: '/register',

    home: '/',
    people: '/people',
    person: (id) => `/people/person/${id}`,
    person_overview: (id) => `/people/person/${id}/overview`,
    person_edit: (id) => `/people/person/${id}/edit`,
    settings: '/settings',
    profile: '/profile',

    wildcard: '*',
}