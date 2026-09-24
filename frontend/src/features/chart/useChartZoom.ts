import { select } from 'd3-selection';
import { type D3ZoomEvent, type ZoomBehavior, type ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { Point } from './layout/geometry';
import type { ChartBounds } from './layout/types';
import { fittedView, openingView, scaleLimits, showsWholeCard, type ViewTransform, type Viewport } from './viewTransform';

export interface ChartZoom {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly fitToView: () => void;
  readonly reveal: (centre: Point) => void;
}

export interface ChartZoomOptions {
  readonly canvasRef: RefObject<SVGSVGElement | null>;
  readonly sceneRef: RefObject<SVGGElement | null>;
  readonly bounds: ChartBounds;
  readonly focus: Point;
}

type CanvasZoom = ZoomBehavior<SVGSVGElement, unknown>;

type ZoomExtent = [[number, number], [number, number]];

interface ZoomTarget {
  readonly behaviour: CanvasZoom;
  readonly canvas: SVGSVGElement;
}

const ZOOM_STEP = 1.4;
const DOUBLE_CLICK_ZOOM_MILLISECONDS = 250;

export function useChartZoom({ canvasRef, sceneRef, bounds, focus }: ChartZoomOptions): ChartZoom {
  const targetRef = useRef<ZoomTarget | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (canvas === null || scene === null) {
      return undefined;
    }
    targetRef.current = { canvas, behaviour: attachZoom({ canvas, scene, bounds, focus }) };
    return () => {
      select(canvas).on('.zoom', null);
      targetRef.current = null;
    };
  }, [canvasRef, sceneRef, bounds, focus]);
  const zoomIn = useCallback(() => {
    scaleView(targetRef.current, ZOOM_STEP);
  }, []);
  const zoomOut = useCallback(() => {
    scaleView(targetRef.current, 1 / ZOOM_STEP);
  }, []);
  const fitToView = useCallback(() => {
    fitView(targetRef.current, bounds);
  }, [bounds]);
  const reveal = useCallback((centre: Point) => {
    revealCard(targetRef.current, centre);
  }, []);
  return useMemo(() => ({ zoomIn, zoomOut, fitToView, reveal }), [zoomIn, zoomOut, fitToView, reveal]);
}

function attachZoom({ canvas, scene, bounds, focus }: { canvas: SVGSVGElement; scene: SVGGElement; bounds: ChartBounds; focus: Point }): CanvasZoom {
  const viewport = viewportOf(canvas);
  const behaviour = zoom<SVGSVGElement, unknown>()
    .extent((): ZoomExtent => [
      [0, 0],
      [canvas.clientWidth, canvas.clientHeight],
    ])
    .scaleExtent(scaleLimits(bounds, viewport))
    .duration(prefersReducedMotion() ? 0 : DOUBLE_CLICK_ZOOM_MILLISECONDS)
    .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
      scene.setAttribute('transform', event.transform.toString());
    });
  const selection = select(canvas);
  selection.call(behaviour);
  behaviour.transform(selection, toZoomTransform(openingView({ bounds, focus, viewport })));
  return behaviour;
}

function scaleView(target: ZoomTarget | null, factor: number): void {
  if (target !== null) {
    target.behaviour.scaleBy(select(target.canvas), factor);
  }
}

function fitView(target: ZoomTarget | null, bounds: ChartBounds): void {
  if (target !== null) {
    target.behaviour.transform(select(target.canvas), toZoomTransform(fittedView(bounds, viewportOf(target.canvas))));
  }
}

function revealCard(target: ZoomTarget | null, centre: Point): void {
  if (target === null) {
    return;
  }
  const { x, y, k } = zoomTransform(target.canvas);
  if (!showsWholeCard({ view: { x, y, scale: k }, viewport: viewportOf(target.canvas), centre })) {
    target.behaviour.translateTo(select(target.canvas), centre.x, centre.y);
  }
}

function toZoomTransform(view: ViewTransform): ZoomTransform {
  return zoomIdentity.translate(view.x, view.y).scale(view.scale);
}

function viewportOf(canvas: SVGSVGElement): Viewport {
  return { width: canvas.clientWidth, height: canvas.clientHeight };
}

function prefersReducedMotion(): boolean {
  return 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
