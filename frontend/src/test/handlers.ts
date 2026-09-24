import { type HttpHandler, HttpResponse, http } from 'msw';
import type { ApiErrorBody, ImportReport, ImportResult, ParentLinkInput, ParentLinkKind, PartnershipInput, PartnershipTerms, PersonProfile } from '../api/types';
import type { CandidateRelation, FakeFamilyBackend } from './fakeBackend';
import { GUEST_VIEWER } from './fixtures';

interface PersonParams {
  personId: string;
}

interface ItemParams {
  itemId: string;
}

const NOT_FOUND = { code: 'route.not_found', message: 'Nothing was found at this address.' };

const SAMPLE_IMPORT_REPORT: ImportReport = {
  people_count: 3,
  parent_link_count: 2,
  partnership_count: 1,
  photo_count: 0,
  skipped: [{ location: 'line 42', reason: 'Unknown tag _MILT was ignored.' }],
};

export function familyHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    ...workspaceHandlers(backend),
    ...peopleHandlers(backend),
    ...candidateHandlers(backend),
    ...photoHandlers(backend),
    ...parentLinkHandlers(backend),
    ...partnershipHandlers(backend),
    ...gedcomHandlers(backend),
  ];
}

export function apiErrorResponse(status: number, error: Omit<ApiErrorBody['error'], 'fields'> & { fields?: Record<string, string[]> }): HttpResponse<ApiErrorBody> {
  return HttpResponse.json<ApiErrorBody>({ error: { fields: {}, ...error } }, { status });
}

function workspaceHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.get('/api/me/', () => HttpResponse.json(GUEST_VIEWER)),
    http.get('/api/workspace/', () => HttpResponse.json(backend.workspace())),
    http.put<never, { person_id: number | null }>('/api/workspace/home-person/', async ({ request }) => {
      const { person_id: personId } = await request.json();
      return HttpResponse.json(backend.setHomePerson(personId));
    }),
  ];
}

function peopleHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.get('/api/people/', ({ request }) => {
      const query = new URL(request.url).searchParams;
      const page = backend.listPeople({ search: query.get('search') ?? '', offset: Number(query.get('offset') ?? 0), limit: Number(query.get('limit') ?? 50) });
      return HttpResponse.json(page);
    }),
    http.post<never, PersonProfile>('/api/people/', async ({ request }) => HttpResponse.json(backend.createPerson(await request.json()), { status: 201 })),
    http.get<PersonParams>('/api/people/:personId/', ({ params }) => found(backend.person(Number(params.personId)))),
    http.put<PersonParams, PersonProfile>('/api/people/:personId/', async ({ params, request }) =>
      found(backend.updatePerson(Number(params.personId), await request.json())),
    ),
    http.delete<PersonParams>('/api/people/:personId/', ({ params }) => deleted(backend.deletePerson(Number(params.personId)))),
    http.get<PersonParams>('/api/people/:personId/chart/', ({ params }) => found(backend.chart(Number(params.personId)))),
  ];
}

function candidateHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  const relations: CandidateRelation[] = ['parent', 'child', 'partner'];
  return relations.map((relation) =>
    http.get<PersonParams>(`/api/people/:personId/${relation}-candidates/`, ({ params, request }) => {
      const search = new URL(request.url).searchParams.get('search') ?? '';
      return HttpResponse.json(backend.candidates(Number(params.personId), relation, search));
    }),
  );
}

function photoHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.put<PersonParams>('/api/people/:personId/photo/', ({ params }) => deleted(backend.setPhotoPresence(Number(params.personId), true))),
    http.delete<PersonParams>('/api/people/:personId/photo/', ({ params }) => deleted(backend.setPhotoPresence(Number(params.personId), false))),
  ];
}

function parentLinkHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.post<never, ParentLinkInput>('/api/parent-links/', async ({ request }) => HttpResponse.json(backend.createParentLink(await request.json()), { status: 201 })),
    http.put<ItemParams, { kind: ParentLinkKind }>('/api/parent-links/:itemId/', async ({ params, request }) =>
      found(backend.changeParentLinkKind(Number(params.itemId), (await request.json()).kind)),
    ),
    http.delete<ItemParams>('/api/parent-links/:itemId/', ({ params }) => deleted(backend.removeParentLink(Number(params.itemId)))),
  ];
}

function partnershipHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.post<never, PartnershipInput>('/api/partnerships/', async ({ request }) => HttpResponse.json(backend.createPartnership(await request.json()), { status: 201 })),
    http.put<ItemParams, { terms: PartnershipTerms }>('/api/partnerships/:itemId/', async ({ params, request }) =>
      found(backend.changePartnershipTerms(Number(params.itemId), (await request.json()).terms)),
    ),
    http.delete<ItemParams>('/api/partnerships/:itemId/', ({ params }) => deleted(backend.removePartnership(Number(params.itemId)))),
  ];
}

function gedcomHandlers(backend: FakeFamilyBackend): HttpHandler[] {
  return [
    http.post('/api/gedcom/preview/', () => HttpResponse.json(SAMPLE_IMPORT_REPORT)),
    http.post('/api/gedcom/import/', () => {
      const firstImported = backend.createPerson(importedProfile('Josiah', 'Wedgwood'));
      backend.createPerson(importedProfile('Sarah', 'Wedgwood'));
      backend.createPerson(importedProfile('Susannah', 'Wedgwood'));
      const importOutcome: ImportResult = { ...SAMPLE_IMPORT_REPORT, home_person_id: firstImported.id };
      return HttpResponse.json(importOutcome, { status: 201 });
    }),
  ];
}

function importedProfile(givenNames: string, surname: string): PersonProfile {
  return { given_names: givenNames, surname, sex: 'unknown', birth: { date: null, place: '' }, death: null, biography: '' };
}

function found<Body extends object>(body: Body | undefined): HttpResponse<Body | ApiErrorBody> {
  return body === undefined ? apiErrorResponse(404, NOT_FOUND) : HttpResponse.json(body);
}

function deleted(existed: boolean): HttpResponse<null | ApiErrorBody> {
  return existed ? new HttpResponse(null, { status: 204 }) : apiErrorResponse(404, NOT_FOUND);
}
