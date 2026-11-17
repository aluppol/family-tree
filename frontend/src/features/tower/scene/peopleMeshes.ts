import { Group, IcosahedronGeometry, InstancedMesh, type Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { TowerNode } from '../layout/towerTypes';
import { type ScenePalette, fadedTowardBackground, toneColor } from './sceneColors';
import type { SceneFocus } from './sceneTypes';

export const SPHERE_RADIUS = 0.3;

const FOCUS_GROWTH = 1.4;
const HALO_RADIUS = 0.66;
const HALO_OPACITY = 0.3;
const FADE = 0.5;
const STILL = new Quaternion();

interface Slot {
  readonly mesh: InstancedMesh;
  readonly index: number;
  readonly node: TowerNode;
}

export class PeopleMeshes {
  readonly group = new Group();
  private readonly solid: InstancedMesh;
  private readonly hollow: InstancedMesh;
  private readonly halo: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly slots: readonly Slot[];

  constructor(nodes: readonly TowerNode[]) {
    const solidNodes = nodes.filter((node) => !node.isEstimated);
    const hollowNodes = nodes.filter((node) => node.isEstimated);
    this.solid = new InstancedMesh(new SphereGeometry(1, 24, 16), new MeshStandardMaterial({ roughness: 0.42, metalness: 0.06 }), solidNodes.length);
    this.hollow = new InstancedMesh(new IcosahedronGeometry(1, 1), new MeshBasicMaterial({ wireframe: true }), hollowNodes.length);
    this.halo = new Mesh(new SphereGeometry(1, 24, 16), new MeshBasicMaterial({ transparent: true, opacity: HALO_OPACITY, depthWrite: false }));
    this.halo.visible = false;
    this.slots = [...slotsOf(this.solid, solidNodes), ...slotsOf(this.hollow, hollowNodes)];
    this.group.add(this.solid, this.hollow, this.halo);
  }

  paint(palette: ScenePalette, focus: SceneFocus | null): void {
    for (const { mesh, index, node } of this.slots) {
      const color = toneColor(palette, node.tone);
      const isLit = focus === null || focus.highlightedIds.has(node.person.id);
      mesh.setColorAt(index, isLit ? color : fadedTowardBackground(color, palette, FADE));
      mesh.setMatrixAt(index, placement(node, focus?.focusId === node.person.id ? SPHERE_RADIUS * FOCUS_GROWTH : SPHERE_RADIUS));
    }
    for (const mesh of [this.solid, this.hollow]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor !== null) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
    this.paintHalo(palette, focus);
  }

  dispose(): void {
    for (const mesh of [this.solid, this.hollow, this.halo]) {
      mesh.geometry.dispose();
      disposeMaterial(mesh.material);
    }
    this.solid.dispose();
    this.hollow.dispose();
  }

  private paintHalo(palette: ScenePalette, focus: SceneFocus | null): void {
    const focusSlot = this.slots.find((slot) => slot.node.person.id === focus?.focusId);
    this.halo.visible = focusSlot !== undefined;
    if (focusSlot !== undefined) {
      const { x, y, z } = focusSlot.node.position;
      this.halo.position.set(x, y, z);
      this.halo.scale.setScalar(HALO_RADIUS);
      this.halo.material.color.copy(palette.gold);
    }
  }
}

function slotsOf(mesh: InstancedMesh, nodes: readonly TowerNode[]): Slot[] {
  return nodes.map((node, index) => ({ mesh, index, node }));
}

function placement(node: TowerNode, radius: number): Matrix4 {
  const { x, y, z } = node.position;
  return new Matrix4().compose(new Vector3(x, y, z), STILL, new Vector3(radius, radius, radius));
}

export function disposeMaterial(material: Material | Material[]): void {
  for (const each of [material].flat()) {
    each.dispose();
  }
}
