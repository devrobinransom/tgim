'use client';

import Link from 'next/link';
import { LocateFixed, MapPinned, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PublicIssue } from '@tgim/shared';
import { CategoryBadge } from './primitives';

const MUMBAI_CENTER: [number, number] = [72.8777, 19.076];
const DEMO_MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
const ISSUE_SOURCE = 'tgim-public-issues';
const CLUSTER_LAYER = 'tgim-issue-clusters';
const CLUSTER_COUNT_LAYER = 'tgim-issue-cluster-count';
const POINT_LAYER = 'tgim-issue-points';

type MapStatus = 'loading' | 'ready' | 'error';

function validIssues(issues: PublicIssue[]) {
  return issues.filter((issue) => Number.isFinite(issue.public_latitude) && Number.isFinite(issue.public_longitude));
}

function issueGeoJson(issues: PublicIssue[], selectedId: string | null): Parameters<GeoJSONSource['setData']>[0] {
  return {
    type: 'FeatureCollection',
    features: validIssues(issues).map((issue) => ({
      type: 'Feature',
      id: issue.id,
      geometry: {
        type: 'Point',
        coordinates: [issue.public_longitude, issue.public_latitude],
      },
      properties: {
        id: issue.id,
        category: issue.category,
        severity: issue.severity,
        selected: issue.id === selectedId,
      },
    })),
  };
}

function MapFallback({ issues, reason }: { issues: PublicIssue[]; reason: 'empty' | 'unavailable' }) {
  const copy = reason === 'empty'
    ? 'This area has no public-safe report points yet. The map will appear when a report is eligible for the public record.'
    : 'The basemap could not load. Report details remain available without exposing precise locations.';
  const Icon = reason === 'empty' ? MapPinned : WifiOff;
  return (
    <div className="map-fallback" role="status">
      <Icon size={24} />
      <div>
        <strong>{reason === 'empty' ? 'No map points yet' : 'Map unavailable'}</strong>
        <p>{copy}</p>
        {issues.length > 0 ? <span>{issues.length} privacy-safe {issues.length === 1 ? 'report remains' : 'reports remain'} in the evidence list.</span> : null}
      </div>
    </div>
  );
}

export function GeoMap({
  issues,
  selectedIssueId,
  onSelectIssue,
  label = 'Privacy-safe civic issue map',
}: {
  issues: PublicIssue[];
  selectedIssueId?: string | null;
  onSelectIssue?: (issueId: string) => void;
  label?: string;
}) {
  const safeIssues = useMemo(() => validIssues(issues), [issues]);
  const [activeId, setActiveId] = useState<string | null>(selectedIssueId || safeIssues[0]?.id || null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapModuleRef = useRef<typeof import('maplibre-gl') | null>(null);
  const issuesRef = useRef(safeIssues);
  const activeIdRef = useRef(activeId);
  const onSelectRef = useRef(onSelectIssue);
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL
    || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? DEMO_MAP_STYLE : undefined);
  const requestedActiveId = selectedIssueId || activeId;
  const resolvedActiveId = safeIssues.some((issue) => issue.id === requestedActiveId)
    ? requestedActiveId
    : safeIssues[0]?.id || null;

  const activeIssue = safeIssues.find((issue) => issue.id === resolvedActiveId) || safeIssues[0];
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of safeIssues) counts.set(issue.category, (counts.get(issue.category) || 0) + 1);
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [safeIssues]);

  useEffect(() => {
    issuesRef.current = safeIssues;
    activeIdRef.current = resolvedActiveId;
    onSelectRef.current = onSelectIssue;
  }, [onSelectIssue, resolvedActiveId, safeIssues]);

  useEffect(() => {
    if (!styleUrl || !containerRef.current || safeIssues.length === 0) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    setStatus('loading');

    void import('maplibre-gl').then((maplibregl) => {
      if (disposed || !containerRef.current) return;
      mapModuleRef.current = maplibregl;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: MUMBAI_CENTER,
        zoom: 9.5,
        minZoom: 8,
        maxZoom: 14,
        cooperativeGestures: true,
        renderWorldCopies: false,
        attributionControl: {
          compact: true,
          customAttribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>',
        },
      });
      map.getCanvas().setAttribute('aria-label', label);
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');

      const fitToData = (duration = 0) => {
        const current = issuesRef.current;
        if (current.length === 0) return;
        if (current.length === 1) {
          map.easeTo({
            center: [current[0].public_longitude, current[0].public_latitude],
            zoom: 12,
            duration,
          });
          return;
        }
        const bounds = new maplibregl.LngLatBounds();
        for (const issue of current) bounds.extend([issue.public_longitude, issue.public_latitude]);
        map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration });
      };

      map.on('load', () => {
        if (disposed) return;
        map.addSource(ISSUE_SOURCE, {
          type: 'geojson',
          data: issueGeoJson(issuesRef.current, activeIdRef.current),
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 46,
        });
        map.addLayer({
          id: CLUSTER_LAYER,
          type: 'circle',
          source: ISSUE_SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#ff5200',
            'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 50, 29],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: ISSUE_SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Open Sans Bold'],
            'text-size': 12,
          },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: POINT_LAYER,
          type: 'circle',
          source: ISSUE_SOURCE,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match', ['get', 'category'],
              'water', '#2563eb',
              'roads', '#ca8a04',
              'garbage', '#078a5b',
              'health', '#dc2626',
              'safety', '#7c3aed',
              'jobs', '#0f766e',
              'transport', '#0891b2',
              'housing', '#ea580c',
              '#ff5200',
            ],
            'circle-radius': ['case', ['boolean', ['get', 'selected'], false], 11, 8],
            'circle-stroke-width': ['case', ['boolean', ['get', 'selected'], false], 4, 2],
            'circle-stroke-color': ['case', ['boolean', ['get', 'selected'], false], '#172033', '#ffffff'],
            'circle-opacity': 0.92,
          },
        });

        map.on('click', CLUSTER_LAYER, async (event) => {
          const cluster = event.features?.[0];
          if (!cluster || cluster.geometry.type !== 'Point') return;
          const source = map.getSource(ISSUE_SOURCE) as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(Number(cluster.properties?.cluster_id));
          map.easeTo({ center: cluster.geometry.coordinates as [number, number], zoom });
        });
        map.on('click', POINT_LAYER, (event) => {
          const issueId = String(event.features?.[0]?.properties?.id || '');
          if (!issueId) return;
          setActiveId(issueId);
          onSelectRef.current?.(issueId);
        });
        for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        }
        fitToData(0);
        setStatus('ready');
      });
      map.on('error', () => {
        if (!map.isStyleLoaded()) setStatus('error');
      });
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
    }).catch(() => setStatus('error'));

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      mapModuleRef.current = null;
    };
  }, [label, safeIssues.length, styleUrl]);

  useEffect(() => {
    const source = mapRef.current?.getSource(ISSUE_SOURCE) as GeoJSONSource | undefined;
    source?.setData(issueGeoJson(safeIssues, resolvedActiveId));
  }, [resolvedActiveId, safeIssues]);

  const resetView = () => {
    const map = mapRef.current;
    const maplibregl = mapModuleRef.current;
    if (!map || !maplibregl || safeIssues.length === 0) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (safeIssues.length === 1) {
      map.easeTo({ center: [safeIssues[0].public_longitude, safeIssues[0].public_latitude], zoom: 12, duration: reducedMotion ? 0 : 400 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const issue of safeIssues) bounds.extend([issue.public_longitude, issue.public_latitude]);
    map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: reducedMotion ? 0 : 400 });
  };

  if (safeIssues.length === 0) return <MapFallback issues={issues} reason="empty" />;
  if (!styleUrl) return <MapFallback issues={safeIssues} reason="unavailable" />;

  return (
    <section className="geo-map-shell" aria-label={label}>
      <div className="geo-map-toolbar">
        <span><LocateFixed size={16} /> {safeIssues.length} public-safe {safeIssues.length === 1 ? 'report' : 'reports'}</span>
        <button type="button" onClick={resetView}><RotateCcw size={15} /> Reset view</button>
      </div>
      <div className="geo-map-stage">
        <div ref={containerRef} className="geo-map" />
        {status === 'loading' ? <div className="geo-map-status" role="status">Loading civic map…</div> : null}
        {status === 'error' ? <div className="geo-map-status error" role="status"><WifiOff size={18} /> Basemap unavailable. Evidence remains below.</div> : null}
      </div>
      <div className="geo-map-evidence" aria-live="polite">
        {activeIssue ? (
          <div className="geo-map-selection">
            <span className="selection-label">Selected report</span>
            <strong>{activeIssue.description}</strong>
            <div><CategoryBadge category={activeIssue.category} /><span>{activeIssue.severity} severity</span>{activeIssue.pincode_code ? <span>Pincode {activeIssue.pincode_code}</span> : null}</div>
            {activeIssue.cluster_id ? <Link href={`/public/clusters/${activeIssue.cluster_id}`}>Open evidence record</Link> : <span>Awaiting cluster review</span>}
          </div>
        ) : null}
        <div className="geo-map-key" aria-label="Visible map categories">
          {categoryCounts.map(([category, count]) => <span key={category}><i data-category={category} /> {category} {count}</span>)}
        </div>
      </div>
      <p className="map-caveat"><ShieldCheck size={14} /> Public-safe coordinates only. Exact reporter locations are never sent to this map. Base geography uses <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>. Use two fingers or the controls to zoom.</p>
    </section>
  );
}
