import { getJson, sendJson } from './client';
import type { TreeGraph, Viewer, Workspace } from './types';

export function fetchViewer(): Promise<Viewer> {
  return getJson<Viewer>('/api/me/');
}

export function fetchWorkspace(): Promise<Workspace> {
  return getJson<Workspace>('/api/workspace/');
}

export function fetchTreeGraph(): Promise<TreeGraph> {
  return getJson<TreeGraph>('/api/workspace/graph/');
}

export function setHomePerson(personId: number): Promise<Workspace> {
  return sendJson<Workspace>('PUT', '/api/workspace/home-person/', { person_id: personId });
}
