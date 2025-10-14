import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import L from 'leaflet';
import { useI18n } from '@/context/I18nContext';

const TimeLapse = () => {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; created_at?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<L.Map | null>(null);
  const gibsTileRef = useRef<L.TileLayer | null>(null);
  const [dateStr, setDateStr] = useState<string>('2024-01-15');
  const [gibs, setGibs] = useState<{ template: string; layers: Array<{ id:string; format:string; tileMatrixSet:string }>; time:string; friendly?: Record<string,string> } | null>(null);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [speedMs, setSpeedMs] = useState<number>(800);
  const [layerId, setLayerId] = useState<string>('');
  type Granularity = 'daily' | 'monthly';
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const friendlyLayerName = (id: string) => {
    // quick mapping for common GIBS layers; fallback to id
    const m: Record<string, string> = {
      'VIIRS_SNPP_CorrectedReflectance_TrueColor': 'VIIRS True Color (SNPP)',
      'VIIRS_NOAA20_CorrectedReflectance_TrueColor': 'VIIRS True Color (NOAA-20)',
      'MODIS_Terra_CorrectedReflectance_TrueColor': 'MODIS Terra True Color',
      'MODIS_Aqua_CorrectedReflectance_TrueColor': 'MODIS Aqua True Color',
      'VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1': 'VIIRS Color Infrared',
    };
    return gibs?.friendly?.[id] || m[id] || id.replace(/_/g, ' ');
  };
  // Persist some UI selections
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timelapse.prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (typeof prefs.speedMs === 'number') setSpeedMs(prefs.speedMs);
        if (typeof prefs.layerId === 'string') setLayerId(prefs.layerId);
        if (typeof prefs.granularity === 'string') setGranularity(prefs.granularity);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('timelapse.prefs', JSON.stringify({ speedMs, layerId, granularity })); } catch {}
  }, [speedMs, layerId, granularity]);
  // Scrubber support: map a numeric day index to a date string
  const baseDateStr = '2023-01-01';
  const toUTCDate = (s: string) => { const d = new Date(s + 'T00:00:00Z'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
  const daysBetween = (a: string, b: string) => Math.floor((toUTCDate(b).getTime() - toUTCDate(a).getTime()) / (24*3600*1000));
  const addDays = (s: string, delta: number) => { const d = toUTCDate(s); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0,10); };
  const [sliderVal, setSliderVal] = useState<number>(() => daysBetween(baseDateStr, dateStr));
  
  // Optional discrete dates from backend for snapping
  const [availableDates, setAvailableDates] = useState<string[] | null>(null);
  const [listMode, setListMode] = useState<'auto'|'daily'|'monthly'|'discrete'>('auto');
  const [snapHint, setSnapHint] = useState<string | null>(null);
  // Build tick labels for months between base and today
  const monthTicks = useMemo(() => {
    const out: Array<{ label: string; index: number }> = [];
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const base = new Date(baseDateStr + 'T00:00:00Z');
      const end = new Date(todayStr + 'T00:00:00Z');
      // Start at first day of base month
      const cur = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
      while (cur <= end) {
        const idx = daysBetween(baseDateStr, cur.toISOString().slice(0,10));
        const label = cur.toLocaleString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
        out.push({ label, index: idx });
        // increment one month
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
    } catch {}
    return out;
  }, [baseDateStr]);
  useEffect(() => {
    (async () => {
      try {
        const data = await api.listDetectionJobs();
        setJobs(data);
        try {
          const g = await api.nasaGibsLayers();
          setGibs(g);
          // Also fetch optional discrete dates for snapping (Sentinel stub)
          const todayStr = new Date().toISOString().slice(0,10);
          try {
            const r = await api.imageryAvailableDates({ provider: 'sentinelhub', start: '2023-01-01', end: todayStr, collection: 'S2L2A', step_days: 5 });
            if (Array.isArray(r?.dates) && r.dates.length) setAvailableDates(r.dates);
          } catch {}
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      }
    })();
  }, []);

  // keep slider in sync when date changes externally (picker or playback)
  useEffect(() => {
    setSliderVal(daysBetween(baseDateStr, dateStr));
  }, [dateStr]);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { center: [22.97, 78.65], zoom: 4.5 as any, preferCanvas: true });
    const tileUrl = import.meta.env.VITE_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    mapInst.current = map;
    return () => { map.remove(); };
  }, []);

  const addGibsLayer = () => {
    const map = mapInst.current; if (!map || !gibs) return;
    const layerIdState = layerId || '';
    const preferred = ((layerIdStateLocal: string) => {
      const explicit = gibs.layers.find(l => l.id === layerIdStateLocal);
      if (explicit) return explicit;
      return gibs.layers.find(l => l.id.includes('VIIRS') && l.id.includes('TrueColor')) || gibs.layers[0];
    })(layerIdState);
    const url = gibs.template
      .replace('{layer}', preferred.id)
      .replace('{time}', dateStr || (gibs.time || 'current'))
      .replace('{set}', preferred.tileMatrixSet)
      .replace('{fmt}', preferred.format);
    // swap tile layer
    if (gibsTileRef.current) { map.removeLayer(gibsTileRef.current); gibsTileRef.current = null; }
    const tl = L.tileLayer(url, { tileSize: 256 as any, opacity: 0.85, attribution: 'NASA GIBS' });
    tl.addTo(map);
    gibsTileRef.current = tl;
  };

  useEffect(() => {
    if (!playing) { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } return; }
    timerRef.current = window.setInterval(() => {
      setDateStr(prev => {
        try {
          const d = new Date(prev || '2024-01-15');
          d.setUTCDate(d.getUTCDate() + 1);
          const next = d.toISOString().slice(0, 10);
          // cap to today
          const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
          const out = next > todayStr ? todayStr : next;
          // update layer each tick
          setTimeout(addGibsLayer, 0);
          return out;
        } catch { return prev; }
      });
    }, speedMs) as unknown as number;
    return () => { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } };
  }, [playing, speedMs, layerId]);
  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">{t('time_lapse')}</h1>
        <p className="text-muted-foreground">{t('time_lapse_desc')}</p>
        <Card className="p-4 mt-4">
          {error && <p className="text-destructive">{error}</p>}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="h-[500px] relative bg-muted/20 border border-border rounded">
                <div ref={mapRef} className="absolute inset-0" />
                <div className="absolute top-3 left-3 bg-card/90 p-2 rounded border border-border text-xs flex gap-2 items-center">
                  <Label className="mr-1">{t('date')}</Label>
                  <input type="date" value={dateStr} onChange={(e)=> setDateStr(e.target.value)} className="border border-border rounded px-2 py-1 h-8" />
                  <Button size="sm" variant="outline" onClick={addGibsLayer}>{t('show_imagery')}</Button>
                  <Button size="sm" variant={playing ? 'destructive' : 'default'} onClick={()=> setPlaying(p=>!p)}>{playing ? t('stop') : t('play')}</Button>
                </div>
                <div className="absolute bottom-3 left-3 right-3 bg-card/90 p-3 rounded border border-border text-xs">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <Label>{t('scrub')}</Label>
                      {(() => {
                        const todayStr = new Date().toISOString().slice(0,10);
                        const maxIdx = daysBetween(baseDateStr, todayStr);
                        // Snap value based on granularity
                        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          let idx = parseInt(e.target.value, 10);
                          setSnapHint(null);
                          const preferDiscrete = listMode === 'discrete' || (listMode === 'auto' && availableDates && availableDates.length > 2);
                          if (preferDiscrete && availableDates && availableDates.length > 2) {
                            // snap to nearest available date
                            const curDate = addDays(baseDateStr, idx);
                            const closest = availableDates.reduce((best, d) => Math.abs(daysBetween(baseDateStr, d) - idx) < Math.abs(daysBetween(baseDateStr, best) - idx) ? d : best, availableDates[0]);
                            idx = daysBetween(baseDateStr, closest);
                            if (curDate !== closest) setSnapHint(`No imagery for ${curDate}, snapped to ${closest}`);
                          } else if ((listMode === 'monthly' || granularity === 'monthly')) {
                            // snap to nearest month tick index
                            const closest = monthTicks.reduce((best, cur) => Math.abs(cur.index - idx) < Math.abs(best.index - idx) ? cur : best, monthTicks[0] || { index: idx, label: '' });
                            idx = closest.index;
                          }
                          setSliderVal(idx);
                          setDateStr(addDays(baseDateStr, idx));
                        };
                        return (
                          <div className="flex flex-col">
                            <input type="range" min={0} max={Math.max(0, maxIdx)} step={1}
                              value={sliderVal}
                              onChange={handleChange}
                              className="w-[320px]"
                            />
                            {/* tick labels: discrete if available and selected, else months */}
                            <div className="relative w-[320px] h-5 mt-1 select-none">
                              {(((listMode === 'discrete' || (listMode === 'auto' && availableDates && availableDates.length > 2)) && availableDates)
                                ? availableDates.map((d) => ({ label: d.slice(0,10), index: daysBetween(baseDateStr, d) }))
                                : monthTicks).map((t) => {
                                const pct = (t.index / Math.max(1, maxIdx)) * 100;
                                return (
                                  <div key={t.index} className="absolute top-0 text-[10px] text-muted-foreground" style={{ left: `calc(${pct}% - 8px)` }}>
                                    |<div className="-mt-1 whitespace-nowrap">{t.label}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {snapHint && <div className="text-[11px] text-muted-foreground">{snapHint}</div>}
                    <div className="flex items-center gap-2">
                      <Label>{t('speed')}</Label>
                      <Select value={String(speedMs)} onValueChange={(v)=> setSpeedMs(parseInt(v,10))}>
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder={t('speed')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1400">{t('speed_slow')}</SelectItem>
                          <SelectItem value="800">{t('speed_normal')}</SelectItem>
                          <SelectItem value="400">{t('speed_fast')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Granularity</Label>
                      <Select value={granularity} onValueChange={(v)=> setGranularity(v as Granularity)}>
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Granularity" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (smooth)</SelectItem>
                          <SelectItem value="monthly">Monthly (snap)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>List Mode</Label>
                      <Select value={listMode} onValueChange={(v)=> setListMode(v as any)}>
                        <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="List Mode" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (prefer discrete)</SelectItem>
                          <SelectItem value="discrete">Discrete (available)</SelectItem>
                          <SelectItem value="monthly">Monthly ticks</SelectItem>
                          <SelectItem value="daily">Daily continuous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>{t('layer')}</Label>
                      <Select value={layerId} onValueChange={(v)=> setLayerId(v)}>
                        <SelectTrigger className="h-8 w-[320px]"><SelectValue placeholder={t('layer')} /></SelectTrigger>
                        <SelectContent>
                          {gibs?.layers?.map(l => (
                            <SelectItem key={l.id} value={l.id}>{friendlyLayerName(l.id)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" onClick={addGibsLayer}>{t('apply')}</Button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('recent_jobs')}</p>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('no_jobs')}</p>
              ) : (
                <ul className="space-y-2 max-h-[460px] overflow-auto pr-1">
                  {jobs.slice(0, 20).map(j => (
                    <li key={j.id} className="flex items-center justify-between border border-border rounded p-3">
                      <div>
                        <p className="font-medium">{t('job')} {j.id}</p>
                        <p className="text-xs text-muted-foreground">{j.created_at ? new Date(j.created_at).toLocaleString() : ''} • {j.status}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={async()=>{
                        try { await api.getVisualization(j.id); alert(t('viz_fetched')); } catch {}
                      }}>{t('open_viz')}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default TimeLapse;
