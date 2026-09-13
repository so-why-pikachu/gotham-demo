import { useEffect, useRef, useState } from 'react';
import { createViewer } from '../cesium/viewer.js';
import { flyToMine, flyToYulong, setChinaView } from '../cesium/camera.js';
import { ADDITIONAL_MINES, MINE_LOCATIONS } from '../cesium/locations.js';
import { addMineMarkers, addYulongMarker, enableMineLabelHover } from '../cesium/marker.js';
import { initializeTruckRoute } from '../cesium/route/controller.js';
import MineInfoPanel, { type MineLocationSummary } from './MineInfoPanel';

interface CesiumViewerProps {
  className?: string;
  onOpenEquipment?: (id: string) => void;
}

type CesiumGlobal = {
  ScreenSpaceEventHandler: new (canvas: unknown) => {
    setInputAction: (callback: (click: { position: unknown }) => void, type: unknown) => void;
    destroy: () => void;
    isDestroyed?: () => boolean;
  };
  ScreenSpaceEventType: { LEFT_CLICK: unknown };
};

type ViewerInstance = {
  scene: {
    canvas: unknown;
    pick: (position: unknown) => { id?: { id?: string } } | undefined;
  };
  isDestroyed?: () => boolean;
  destroy: () => void;
};

export default function CesiumViewer({ className = '', onOpenEquipment }: CesiumViewerProps) {
  const openEquipmentRef = useRef(onOpenEquipment);
  openEquipmentRef.current = onOpenEquipment;
  const containerRef = useRef<HTMLDivElement>(null);
  const creditContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerInstance | null>(null);
  const [selectedMine, setSelectedMine] = useState<MineLocationSummary | null>(null);

  useEffect(() => {
    let disposed = false;
    let viewer: ViewerInstance | null = null;
    let clickHandler: InstanceType<CesiumGlobal['ScreenSpaceEventHandler']> | null = null;
    let disposeMineHover: (() => void) | undefined;
    const Cesium = (globalThis as typeof globalThis & { Cesium?: CesiumGlobal }).Cesium;

    if (!Cesium) {
      console.error('Cesium 加载失败，请检查网络或浏览器 Console。');
      return () => undefined;
    }

    if (!containerRef.current) {
      console.error('Cesium 容器初始化失败。');
      return () => undefined;
    }

    try {
      viewer = createViewer(creditContainerRef.current) as ViewerInstance;
      viewerRef.current = viewer;
      setChinaView(viewer);

      const yulongEntity = addYulongMarker(viewer);
      const otherMineEntities = addMineMarkers(viewer, ADDITIONAL_MINES);
      disposeMineHover = enableMineLabelHover(viewer, [yulongEntity, ...otherMineEntities]);
      const mineConfigById = new Map<string, MineLocationSummary>(
        (MINE_LOCATIONS as MineLocationSummary[]).map((mine) => [mine.id, mine]),
      );

      const routePromise = initializeTruckRoute(viewer, (() => {}) as () => void);
      routePromise.catch((error: unknown) => {
        console.error('Truck-01 路线初始化失败，请检查 Terrain 和 Console。', error);
      });

      clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      clickHandler.setInputAction((click) => {
        const picked = viewer?.scene.pick(click.position);
        const pickedEntityId = picked?.id?.id;
        if (pickedEntityId && ['truck-01','excavator-01','loader-01'].includes(pickedEntityId)) {
          openEquipmentRef.current?.(pickedEntityId);
          return;
        }
        const pickedMine = pickedEntityId
          ? mineConfigById.get(pickedEntityId)
          : undefined;

        if (!pickedMine || !viewer) {
          if (!disposed) {
            setSelectedMine(null);
          }
          return;
        }

        if (!disposed) {
          setSelectedMine(pickedMine);
        }

        if (pickedMine.id === yulongEntity.id) {
          flyToYulong(viewer);
          return;
        }

        flyToMine(viewer, pickedMine);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    } catch (error) {
      console.error('Cesium 初始化失败，请打开浏览器 Console 查看原因。', error);
    }

    return () => {
      disposed = true;
      disposeMineHover?.();
      if (clickHandler && !clickHandler.isDestroyed?.()) {
        clickHandler.destroy();
      }
      if (viewer && !viewer.isDestroyed?.()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div className={`cesium-viewer-shell ${className}`}>
      <div
        ref={containerRef}
        id="cesiumContainer"
        className="cesium-container"
        aria-label="Cesium 三维地球"
      />
      <div
        ref={creditContainerRef}
        className="cesium-attribution"
        aria-label="Cesium 数据归属信息"
      />
      {selectedMine && (
        <MineInfoPanel
          mine={selectedMine}
          onClose={() => setSelectedMine(null)}
        />
      )}
    </div>
  );
}
