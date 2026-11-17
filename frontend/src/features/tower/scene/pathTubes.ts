import { Group, LineCurve3, Mesh, MeshBasicMaterial, TubeGeometry, Vector3 } from 'three';
import type { TowerPoint } from '../layout/towerTypes';
import type { ScenePalette } from './sceneColors';

const TUBE_RADIUS = 0.07;
const TUBE_SIDES = 8;

export class PathTubes {
  readonly group = new Group();
  private readonly material = new MeshBasicMaterial();
  private tubes: Mesh<TubeGeometry, MeshBasicMaterial>[] = [];

  show(points: readonly TowerPoint[], palette: ScenePalette): void {
    this.clear();
    this.material.color.copy(palette.gold);
    this.tubes = points.slice(1).map((point, position) => tubeBetween(points[position] ?? point, point, this.material));
    if (this.tubes.length > 0) {
      this.group.add(...this.tubes);
    }
  }

  recolor(palette: ScenePalette): void {
    this.material.color.copy(palette.gold);
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }

  private clear(): void {
    for (const tube of this.tubes) {
      tube.geometry.dispose();
    }
    this.group.clear();
    this.tubes = [];
  }
}

function tubeBetween(from: TowerPoint, to: TowerPoint, material: MeshBasicMaterial): Mesh<TubeGeometry, MeshBasicMaterial> {
  const curve = new LineCurve3(new Vector3(from.x, from.y, from.z), new Vector3(to.x, to.y, to.z));
  return new Mesh(new TubeGeometry(curve, 1, TUBE_RADIUS, TUBE_SIDES), material);
}
