import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import * as THREE from 'three';
import { API_BASE_URL, withAuth } from '@/lib/config';

// Minimal Cesium viewer with OSM imagery and optional terrain if ION token provided
export type CesiumViewerProps = {
  style?: React.CSSProperties;
  polygons?: Array<any>; // illegal zones: GeoJSON Polygon/MultiPolygon[]
  legalBoundary?: any;   // GeoJSON Polygon/MultiPolygon
  depthPolygons?: Array<{ geometry: any; properties?: { depth?: number } }>; // for translucent overlay
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  showTerrainToggle?: boolean;
  showHeatmapToggle?: boolean;
  enableDraw?: boolean;
  onDrawChange?: (geojson: any | null) => void;
};

export default function CesiumViewer({ style, polygons = [], legalBoundary, depthPolygons = [], bbox, showTerrainToggle = true, showHeatmapToggle = true, enableDraw = true, onDrawChange }: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const terrainOnRef = useRef<boolean>(false);
  // three.js overlay refs
  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeCubeRef = useRef<THREE.Object3D | null>(null);
  const postRenderRemoverRef = useRef<(() => void) | null>(null);
  const [heatOn, setHeatOn] = useState(false);
  const heatEntitiesRef = useRef<Cesium.Entity[] | null>(null);
  const drawActiveRef = useRef<boolean>(false);
  const drawPositionsRef = useRef<Cesium.Cartesian3[]>([]);
  const drawTempEntityRef = useRef<Cesium.Entity | null>(null);
  const eventHandlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Configure Cesium static asset base (handled by vite-plugin-cesium)
    // Set optional Ion token if provided via env
    const ionToken = (import.meta as any).env.VITE_CESIUM_ION_TOKEN as string | undefined;
    if (ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      // set providers after construction for type-compat
      timeline: false,
      animation: false,
      geocoder: false,
      homeButton: true,
      // When scene3DOnly=true, sceneModePicker must be false to avoid runtime error
      sceneModePicker: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      scene3DOnly: true,
    });
    viewerRef.current = viewer;

    // Set OSM base imagery
    try {
      viewer.imageryLayers.removeAll();
      const osm = new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      });
      viewer.imageryLayers.addImageryProvider(osm);
    } catch {}

    // Try to load terrain if Ion token provided
    try {
      if (ionToken && (Cesium as any).createWorldTerrainAsync) {
        (Cesium as any).createWorldTerrainAsync().then((tp: Cesium.TerrainProvider) => {
          if (!viewer.isDestroyed()) { viewer.terrainProvider = tp; terrainOnRef.current = true; }
        }).catch(()=>{});
      }
    } catch {}

    // Basic camera default over India
    viewer.scene.camera.setView({
      destination: Cesium.Rectangle.fromDegrees(68, 7, 97.5, 37),
    });

    // Setup draw interaction if enabled
    if (enableDraw) {
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      eventHandlerRef.current = handler;
      const addPoint = (pos: Cesium.Cartesian3, finish: boolean) => {
        if (!drawActiveRef.current) return;
        const positions = drawPositionsRef.current;
        positions.push(pos);
        if (positions.length >= 3) {
          const hierarchy = new Cesium.PolygonHierarchy([...positions]);
          const fillCol = Cesium.Color.CYAN.withAlpha(0.25);
          if (!drawTempEntityRef.current) {
            drawTempEntityRef.current = viewer.entities.add({ polygon: { hierarchy, material: fillCol, outline: true, outlineColor: Cesium.Color.CYAN } });
          } else {
            (drawTempEntityRef.current.polygon as any).hierarchy = hierarchy;
          }
          if (finish) {
            // finalize
            drawActiveRef.current = false;
            // convert to GeoJSON
            const carto = positions.map(p => Cesium.Cartographic.fromCartesian(p));
            const coords = carto.map(c => [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)]);
            const closed = coords.length >= 3 ? [...coords, coords[0]] : coords;
            const geojson = { type: 'Polygon', coordinates: [closed] };
            try { onDrawChange && onDrawChange(geojson); } catch {}
            // reset
            drawPositionsRef.current = [];
            drawTempEntityRef.current = null;
          }
        }
      };
      handler.setInputAction((click: any) => {
        const pos = viewer.scene.pickPosition(click.position);
        if (pos) addPoint(pos, false);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction((dbl: any) => {
        const pos = viewer.scene.pickPosition(dbl.position);
        if (pos) addPoint(pos, true);
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK as any);
    }

    return () => {
      try { eventHandlerRef.current && eventHandlerRef.current.destroy(); } catch {}
      try { viewer.destroy(); } catch {}
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const flattenToNumberArray = (coords: any): number[] => {
      const out: number[] = [];
      const walk = (v: any) => {
        if (Array.isArray(v)) { for (const x of v) walk(x); }
        else if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
      };
      walk(coords);
      return out;
    };

    // Clear previous entities (our layers)
    const ds = viewer.entities;
    const toRemove: Cesium.Entity[] = [];
    ds.values.forEach((ent) => { if (ent.polygon || ent.polyline) toRemove.push(ent); });
    toRemove.forEach((e) => ds.remove(e));

    // Add legal boundary (green outline + subtle fill)
    try {
      if (legalBoundary && (legalBoundary.type === 'Polygon' || legalBoundary.type === 'MultiPolygon')) {
        const green = Cesium.Color.LIME.withAlpha(0.15);
        const outline = Cesium.Color.LIME;
        const addPoly = (coords: any[]) => {
          const flat = flattenToNumberArray(coords);
          const positions = Cesium.Cartesian3.fromDegreesArray(flat);
          viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(positions), material: green, outline: true, outlineColor: outline, outlineWidth: 2 } });
        };
        if (legalBoundary.type === 'Polygon') addPoly(legalBoundary.coordinates?.[0] || []);
        else (legalBoundary.coordinates || []).forEach((poly: any) => addPoly(poly?.[0] || []));
      }
    } catch {}

    // Add illegal polygons (red fill)
    polygons.forEach((geom) => {
      try {
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return;
        const color = Cesium.Color.RED.withAlpha(0.4);
        if (geom.type === 'Polygon') {
          const coords = geom.coordinates?.[0] || [];
          const flat = flattenToNumberArray(coords);
          const positions = Cesium.Cartesian3.fromDegreesArray(flat);
          viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(positions), material: color } });
        } else {
          // MultiPolygon: iterate rings
          (geom.coordinates || []).forEach((poly: any) => {
            const coords = poly?.[0] || [];
            const flat = flattenToNumberArray(coords);
            const positions = Cesium.Cartesian3.fromDegreesArray(flat);
            viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(positions), material: color } });
          });
        }
      } catch {}
    });

    // Depth overlay polygons (translucent with gradient by depth)
    depthPolygons.forEach((feat) => {
      try {
        const g = feat?.geometry; const depth = feat?.properties?.depth ?? 0;
        if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return;
        const clamp = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
        const t = clamp(depth/30, 0, 1);
        // interpolate blue(0) -> purple(0.5) -> red(1)
        const color = Cesium.Color.fromHsl(0.66*(1-t), 0.8, 0.5, 0.35);
        const addPoly = (coords:any[]) => {
          const flat = flattenToNumberArray(coords);
          const positions = Cesium.Cartesian3.fromDegreesArray(flat);
          viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(positions), material: color } });
        };
        if (g.type === 'Polygon') addPoly(g.coordinates?.[0] || []);
        else (g.coordinates || []).forEach((poly:any)=>addPoly(poly?.[0] || []));
      } catch {}
    });

    // Fly to bbox or entities if any
    try {
      if (bbox && bbox.length === 4) {
        const rect = Cesium.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]);
        viewer.scene.camera.flyTo({ destination: rect });
      } else if (viewer.entities.values.length > 0) {
        viewer.zoomTo(viewer.entities);
      }
    } catch {}
  }, [JSON.stringify(polygons), JSON.stringify(legalBoundary), JSON.stringify(depthPolygons), JSON.stringify(bbox)]);

  // Terrain toggle button (optional)
  useEffect(() => {
    const viewer = viewerRef.current; if (!viewer) return;
    if (!showTerrainToggle) return;
    const btn = document.createElement('button');
    btn.textContent = terrainOnRef.current ? 'Disable Terrain' : 'Enable Terrain';
    btn.style.position = 'absolute';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.zIndex = '1000';
    btn.style.padding = '6px 10px';
    btn.style.background = 'rgba(0,0,0,0.5)';
    btn.style.color = '#fff';
    btn.style.border = '1px solid #444';
    btn.style.borderRadius = '6px';
    const container = containerRef.current!;
    container.style.position = 'relative';
    container.appendChild(btn);
    const click = async () => {
      const ionToken = (import.meta as any).env.VITE_CESIUM_ION_TOKEN as string | undefined;
      if (!ionToken) return; // require token for terrain
      try {
        if (terrainOnRef.current) {
          // disable terrain by setting EllipsoidTerrainProvider
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          terrainOnRef.current = false;
          btn.textContent = 'Enable Terrain';
        } else if ((Cesium as any).createWorldTerrainAsync) {
          const tp: Cesium.TerrainProvider = await (Cesium as any).createWorldTerrainAsync();
          viewer.terrainProvider = tp;
          terrainOnRef.current = true;
          btn.textContent = 'Disable Terrain';
        }
      } catch {}
    };
    btn.addEventListener('click', click);
    return () => { try { btn.removeEventListener('click', click); container.removeChild(btn); } catch {} };
  }, [showTerrainToggle]);

  // Heatmap toggle for 3D (billboard markers rendered from backend heatmap points)
  useEffect(() => {
    const viewer = viewerRef.current; if (!viewer) return;
    if (!showHeatmapToggle) return;
    const btn = document.createElement('button');
    btn.textContent = heatOn ? 'Hide Heatmap' : 'Show Heatmap';
    btn.style.position = 'absolute'; btn.style.top = '10px'; btn.style.left = '140px';
    btn.style.zIndex = '1000'; btn.style.padding = '6px 10px'; btn.style.background = 'rgba(0,0,0,0.5)'; btn.style.color = '#fff'; btn.style.border = '1px solid #444'; btn.style.borderRadius = '6px';
    const container = containerRef.current as HTMLDivElement; if (!container) return;
    container.style.position = 'relative'; container.appendChild(btn);

    const removeHeat = () => {
      if (!viewer || !heatEntitiesRef.current) return;
      for (const e of heatEntitiesRef.current) { try { viewer.entities.remove(e); } catch {} }
      heatEntitiesRef.current = null;
    };
    const colorFor = (intensity: number) => {
      const t = Math.max(0, Math.min(1, intensity / 100));
      return Cesium.Color.fromHsl(0.66*(1-t), 0.9, 0.5, 0.8);
    };
    const addHeat = async () => {
      try {
        const url = new URL(`${API_BASE_URL}/visualization/heatmap`);
        url.searchParams.set('limit', '1000');
        const res = await fetch(url.toString(), { headers: withAuth() });
        if (!res.ok) throw new Error(await res.text());
        const points = await res.json() as Array<{ lat:number; lng:number; intensity:number }>;
        const ents: Cesium.Entity[] = [];
        for (const p of points) {
          const e = viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat), billboard: {
            image: new Cesium.PinBuilder().fromColor(colorFor(p.intensity), 32).toDataURL(),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -8),
            scale: 0.8 + Math.min(1, Math.max(0.2, p.intensity/100))
          }});
          ents.push(e);
        }
        heatEntitiesRef.current = ents;
      } catch {}
    };

    const click = async () => {
      if (heatOn) { removeHeat(); setHeatOn(false); btn.textContent = 'Show Heatmap'; }
      else { await addHeat(); setHeatOn(true); btn.textContent = 'Hide Heatmap'; }
    };
    btn.addEventListener('click', click);
    return () => { try { btn.removeEventListener('click', click); container.removeChild(btn); } catch {} };
  }, [showHeatmapToggle, heatOn]);

  // Draw toggle button
  useEffect(() => {
    const viewer = viewerRef.current; if (!viewer) return;
    if (!enableDraw) return;
    const btn = document.createElement('button');
    btn.textContent = drawActiveRef.current ? 'Finish Drawing (dbl-click)' : 'Draw Polygon';
    btn.style.position = 'absolute'; btn.style.top = '10px'; btn.style.left = '270px';
    btn.style.zIndex = '1000'; btn.style.padding = '6px 10px'; btn.style.background = 'rgba(0,0,0,0.5)'; btn.style.color = '#fff'; btn.style.border = '1px solid #444'; btn.style.borderRadius = '6px';
    const container = containerRef.current as HTMLDivElement; if (!container) return;
    container.style.position = 'relative'; container.appendChild(btn);
    const click = () => {
      drawActiveRef.current = !drawActiveRef.current;
      if (!drawActiveRef.current) {
        // reset if cancelled
        drawPositionsRef.current = [];
        if (drawTempEntityRef.current) { try { viewer.entities.remove(drawTempEntityRef.current); } catch {} drawTempEntityRef.current = null; }
        try { onDrawChange && onDrawChange(null); } catch {}
      }
      btn.textContent = drawActiveRef.current ? 'Finish Drawing (dbl-click)' : 'Draw Polygon';
    };
    btn.addEventListener('click', click);
    return () => { try { btn.removeEventListener('click', click); container.removeChild(btn); } catch {} };
  }, [enableDraw]);

  // Three.js overlay (orientation cube) in top-right corner, synced to Cesium camera orientation
  useEffect(() => {
    const container = containerRef.current; const viewer = viewerRef.current;
    if (!container || !viewer) return;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '10px';
    overlay.style.right = '10px';
    overlay.style.width = '140px';
    overlay.style.height = '140px';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    container.style.position = 'relative';
    container.appendChild(overlay);
    threeContainerRef.current = overlay;

    // Setup three
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(140, 140);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    overlay.appendChild(renderer.domElement);
    threeRendererRef.current = renderer;

    const scene = new THREE.Scene();
    threeSceneRef.current = scene;
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cam.position.set(3, 3, 4);
    cam.lookAt(0,0,0);
    threeCameraRef.current = cam;

    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(5,5,5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Cube with axis colors
    const size = 1;
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff5555 }), // +X
      new THREE.MeshBasicMaterial({ color: 0x55ff55 }), // -X
      new THREE.MeshBasicMaterial({ color: 0x5555ff }), // +Y
      new THREE.MeshBasicMaterial({ color: 0xffff55 }), // -Y
      new THREE.MeshBasicMaterial({ color: 0xff55ff }), // +Z
      new THREE.MeshBasicMaterial({ color: 0x55ffff }), // -Z
    ];
    const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), materials);
    scene.add(cube);
    threeCubeRef.current = cube;

    // Sync with Cesium camera orientation each frame
    const postRender = () => {
      const camCes = viewer.camera;
      const heading = camCes.heading; // radians
      const pitch = camCes.pitch;
      const roll = camCes.roll;
      if (threeCubeRef.current) {
        // Map Cesium (Z up, East-North-Up) orientation approx to three
        threeCubeRef.current.rotation.set(-pitch, -heading, roll, 'XYZ');
      }
      renderer.render(scene, cam);
    };
    viewer.scene.postRender.addEventListener(postRender);
    postRenderRemoverRef.current = () => viewer.scene.postRender.removeEventListener(postRender);

    const onResize = () => {
      const w = overlay.clientWidth || 140; const h = overlay.clientHeight || 140;
      renderer.setSize(w, h);
      cam.aspect = w / Math.max(1, h);
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize); ro.observe(overlay);

    return () => {
      try { ro.disconnect(); } catch {}
      if (postRenderRemoverRef.current) { try { postRenderRemoverRef.current(); } catch {} postRenderRemoverRef.current = null; }
      try { renderer.dispose(); } catch {}
      try { overlay.remove(); } catch {}
      threeRendererRef.current = null; threeSceneRef.current = null; threeCameraRef.current = null; threeCubeRef.current = null; threeContainerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '700px', ...style }} />;
}
