import { API_BASE_URL, withAuth } from "./config";

export type LoginResponse = { access_token: string; token_type: string };

export type MiningReport = { id: string; status: string; result?: any; filename?: string; created_at?: string };

export const api = {
  // AOIs
  async listAois() {
    const res = await fetch(`${API_BASE_URL}/gis/aois`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; name?: string; geometry: any; metadata?: any }>>;
  },
  async createAoi(name: string | undefined, geometry: any, metadata?: any) {
    const res = await fetch(`${API_BASE_URL}/gis/aois`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify({ name, geometry, metadata }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ id: string }>;
  },
  async deleteAoi(id: string) {
    const res = await fetch(`${API_BASE_URL}/gis/aois/${id}`, { method: 'DELETE', headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ id: string; deleted: boolean }>;
  },
  // Google OAuth
  async googleRedirect(role: 'authority' | 'user' = 'user', redirect: string = '/login') {
    const url = new URL(`${API_BASE_URL}/auth/google/redirect`);
    url.searchParams.set('role', role);
    url.searchParams.set('redirect', redirect);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ status: string; url?: string; note?: string }>;
  },
  async me() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ email: string; role: 'user'|'authority'; profile?: Record<string, any> }>;
  },
  async updateMe(profile: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ email: string; role: 'user'|'authority'; profile?: Record<string, any> }>;
  },
  // Auth
  async register(data: { email: string; password: string; role?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async login(data: { email: string; password: string }): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      if (res.status === 503) {
        let text = '';
        try { text = await res.text(); } catch {}
        throw new Error(text || 'Database unavailable (MongoDB). Start MongoDB or use DEV admin credentials.');
      }
      throw new Error(await res.text());
    }
    return res.json();
  },
  async sendOtp(data: { email: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async verifyOtp(data: { email: string; otp: string }): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Mining
  async uploadMining(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE_URL}/mining/upload`, {
      method: "POST",
      headers: withAuth(),
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ report_id: string; task_id: string }>;
  },
  async getReport(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/mining/${reportId}`, {
      method: "GET",
      headers: withAuth(),
    });
    if (!res.ok) throw new Error(await res.text());
  return res.json();
  },

  async listReports(email?: string): Promise<MiningReport[]> {
    try {
      const url = new URL(`${API_BASE_URL}/mining`);
      if (email) url.searchParams.set('email', email);
      const res = await fetch(url.toString(), { headers: withAuth() });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  // Detections
  async listDetections(
    reportId: string,
    limit = 100,
    skip = 0,
    options?: { geometryType?: string | string[]; withCentroid?: boolean }
  ) {
    const url = new URL(`${API_BASE_URL}/mining/detections`);
    url.searchParams.set('report_id', reportId);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('skip', String(skip));
    if (options?.geometryType) url.searchParams.set('geometry_type', Array.isArray(options.geometryType) ? options.geometryType.join(',') : options.geometryType);
    if (options?.withCentroid) url.searchParams.set('with_centroid', 'true');
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; report_id: string; geometry: any; properties: any; centroid?: any }>>;
  },

  // GIS boundary check
  async queryIllegalByBoundary(
    boundaryGeoJSON: any,
    mode: 'within' | 'intersects' = 'within',
    options?: { reportId?: string; geometryTypes?: string | string[]; withCentroid?: boolean }
  ) {
    const url = new URL(`${API_BASE_URL}/mining/illegal/by-boundary`);
    url.searchParams.set('mode', mode);
    if (options?.reportId) url.searchParams.set('report_id', options.reportId);
    if (options?.geometryTypes) url.searchParams.set('geometry_type', Array.isArray(options.geometryTypes) ? options.geometryTypes.join(',') : options.geometryTypes);
    if (options?.withCentroid) url.searchParams.set('with_centroid', 'true');
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify(boundaryGeoJSON),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; report_id: string; geometry: any; properties: any; centroid?: any }>>;
  },

  // Reports PDF
  async downloadReportPdf(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
      method: "GET",
      headers: withAuth(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async getReportSummary(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}/summary`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ report_id: string; status?: string; summary: string }>;
  },

  // Blockchain
  async blockchainLog(payload: any) {
    const res = await fetch(`${API_BASE_URL}/blockchain/log`, {
      method: "POST",
      headers: { ...withAuth({"Content-Type": "application/json"}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async blockchainVerify(txHash: string) {
    const res = await fetch(`${API_BASE_URL}/blockchain/verify/${txHash}`, {
      method: "GET",
      headers: withAuth(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async blockchainList() {
    const res = await fetch(`${API_BASE_URL}/blockchain/logs`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; report_id?: string; tx_hash: string; verified?: boolean }>>;
  },

  // Admin: update user role (authority only)
  async adminUpdateUserRole(email: string, role: 'authority' | 'user') {
    const res = await fetch(`${API_BASE_URL}/auth/admin/users/role`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // GIS - Shapefiles
  async createShapefile(input: { name: string; geojson: any; metadata?: any }) {
    const res = await fetch(`${API_BASE_URL}/gis/shapefiles`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ id: string }>
  },
  async listShapefiles() {
    const res = await fetch(`${API_BASE_URL}/gis/shapefiles`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; name: string; geojson: any; metadata: any }>>
  },
  async deleteShapefile(id: string) {
    const res = await fetch(`${API_BASE_URL}/gis/shapefiles/${id}`, { method: 'DELETE', headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async uploadConvertGeoJSON(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`${API_BASE_URL}/gis/upload/convert-geojson`, { method: 'POST', headers: withAuth(), body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ id: string; geojson: any }>
  },

  // Spatial & DEM
  async satelliteFetch(input: { provider: string; aoi: any; date_range: { start: string; end: string }; product?: string }) {
    const res = await fetch(`${API_BASE_URL}/spatial/satellite/fetch`, {
      method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async satellitePreprocess(input: { steps: string[]; asset_path?: string }) {
    const res = await fetch(`${API_BASE_URL}/spatial/satellite/preprocess`, {
      method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async demEstimateVolume(input: { dem_source: string; boundary: any }) {
    const res = await fetch(`${API_BASE_URL}/spatial/dem/estimate-volume`, {
      method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ volume_cubic_m: number; dem_source: string }>
  },
  async lidarImport(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`${API_BASE_URL}/spatial/lidar/import`, { method: 'POST', headers: withAuth(), body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async changeDetection(input: { scene1: string; scene2: string; aoi: any }) {
    const res = await fetch(`${API_BASE_URL}/spatial/change-detection`, {
      method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // NASA/ISRO integrations
  async nasaCmrSearch(input: { short_name: string; bbox?: string; temporal?: string; page_size?: number }) {
    const res = await fetch(`${API_BASE_URL}/spatial/nasa/cmr/search`, {
      method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async nasaGibsLayers() {
    const res = await fetch(`${API_BASE_URL}/spatial/nasa/gibs/layers`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ template: string; layers: Array<{ id: string; format: string; tileMatrixSet: string }>; time: string; friendly?: Record<string,string> }>
  },
  async imageryAvailableDates(input: { provider?: string; aoi?: any; start: string; end: string; collection?: string; step_days?: number }) {
    const res = await fetch(`${API_BASE_URL}/spatial/imagery/available-dates`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ provider: string; start: string; end: string; count: number; dates: string[] }>;
  },
  async nasaEonetEvents(limit = 50) {
    const url = new URL(`${API_BASE_URL}/spatial/nasa/eonet/events`);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async isroBhuvanTiles() {
    const res = await fetch(`${API_BASE_URL}/spatial/isro/bhuvan/tiles`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ template: string; note?: string }>
  },

  // Detection jobs
  async createDetectionJob(input: { imagery?: File; shapefile?: File; dem?: File; notes?: string }) {
    const fd = new FormData();
    if (input.imagery) fd.append('imagery', input.imagery);
    if (input.shapefile) fd.append('shapefile', input.shapefile);
    if (input.dem) fd.append('dem', input.dem);
    if (input.notes) fd.append('notes', input.notes);
    const res = await fetch(`${API_BASE_URL}/ai/models/detect`, { method: 'POST', headers: withAuth(), body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ job_id: string; task_id: string; status: string }>;
  },
  async getVisualization(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/visualization/${jobId}`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ job_id: string; status: string; layers: any; metrics: any; map_url?: string; aoi_bbox?: [number,number,number,number] }>;
  },
  async getHeatmapPoints(limit = 1000, metric?: 'density'|'volume'|'violations'|'depth') {
    const url = new URL(`${API_BASE_URL}/visualization/heatmap`);
    url.searchParams.set('limit', String(limit));
    if (metric) url.searchParams.set('metric', metric);
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ lat: number; lng: number; intensity: number }>>;
  },
  async listDetectionJobs() {
    const res = await fetch(`${API_BASE_URL}/ai/models/jobs`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; status: string; created_at?: string; area_illegal?: number; volume_cubic_m?: number }>>;
  },
  async getDetectionJob(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/ai/models/jobs/${jobId}`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ id: string; status: string; created_at?: string; completed_at?: string; area_legal?: number; area_illegal?: number; volume_cubic_m?: number; depth_stats?: any; result_map_url?: string }>;
  },
  async createDetectionJobFromUrl(url: string, notes?: string, provider?: 'earthdata'|'http') {
    const res = await fetch(`${API_BASE_URL}/ai/models/detect-from-url`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify({ url, notes, provider })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ job_id: string; task_id: string; status: string }>
  },
  async createDetectionJobFromBbox(bbox: [number,number,number,number], notes?: string, olderDate?: string) {
    const res = await fetch(`${API_BASE_URL}/ai/models/detect-from-bbox`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify({ bbox, notes, older_date: olderDate })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ job_id: string; task_id: string; status: string }>
  },

  // Reports authenticity
  async pinReport(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}/pin`, { method: 'POST', headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ report_id: string; cid: string; url: string; tx_hash: string; verified: boolean }>
  },
  async getReportAuthenticity(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}/authenticity`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ report_id: string; cid?: string; url?: string; tx_hash?: string; valid?: boolean }>
  },
  // Metrics & overview
  async getOverviewMetrics() {
    const res = await fetch(`${API_BASE_URL}/metrics/overview`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ reports_total: number; alerts_total: number; blockchain_verified: number; detection_jobs: number; active_sites: number }>;
  },
  async listRecentDetections(limit = 200) {
    const url = new URL(`${API_BASE_URL}/mining/detections-recent`);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Array<{ id: string; geometry: any; properties: any }>>;
  },
  // PyTorch-backed helpers
  async detectIllegalMining(file: File) {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch(`${API_BASE_URL}/ai/detect/image`, { method: 'POST', headers: withAuth(), body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ count: number; detections: Array<{ x: number; y: number; w: number; h: number; score: number; label: string }> }>;
  },
  async scoreIoTAnomaly(values: number[]) {
    const r = await fetch(`${API_BASE_URL}/iot/anomaly-score`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify(values)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ score: number; anomaly: boolean; note?: string }>;
  },
  // Automation
  async automationEmit(event: string, data: Record<string, any> = {}) {
    const res = await fetch(`${API_BASE_URL}/automation/emit`, {
      method: 'POST',
      headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
      body: JSON.stringify({ event, data })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ sent: boolean }>
  },
  // Added endpoints
  async complianceCheck(leaseGeoJSON: any, options?: { reportId?: string; geometryType?: string | string[] }) {
    const url = new URL(`${API_BASE_URL}/mining/compliance/check`);
    if (options?.reportId) url.searchParams.set('report_id', options.reportId);
    if (options?.geometryType) url.searchParams.set('geometry_type', Array.isArray(options.geometryType) ? options.geometryType.join(',') : options.geometryType);
    const res = await fetch(url.toString(), { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(leaseGeoJSON) });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ compliance_score: number; outside_count: number; outside_area?: number; lease_area?: number; outside: any[] }>;
  },
  async mintReportNft(reportId: string) {
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}/mint`, { method: 'POST', headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ report_id: string; tx_hash: string }>;
  },
  async getVisualizationVR(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/visualization/vr/${jobId}`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async temporalCompare(input: { aoi: any; t1: string; t2: string; collection?: string }) {
    const res = await fetch(`${API_BASE_URL}/spatial/temporal/compare`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ t1: any[]; t2: any[] }>;
  },
  async scheduleSatelliteSync(input: { aoi: any; cadence_days?: number; provider?: string }) {
    const res = await fetch(`${API_BASE_URL}/spatial/sync/schedule`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async listSatelliteSyncJobs() {
    const res = await fetch(`${API_BASE_URL}/spatial/sync/jobs`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getEnvironmentalScore(lat?: number, lng?: number, date?: string) {
    const url = new URL(`${API_BASE_URL}/metrics/environmental/score`);
    if (lat !== undefined && lng !== undefined) { url.searchParams.set('lat', String(lat)); url.searchParams.set('lng', String(lng)); }
    if (date) url.searchParams.set('date', date);
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getMiningTimeline(buckets = 12) {
    const url = new URL(`${API_BASE_URL}/metrics/timeline/mining`);
    url.searchParams.set('buckets', String(buckets));
    const res = await fetch(url.toString(), { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async policyAsk(question: string) {
    const res = await fetch(`${API_BASE_URL}/ai/policy/ask`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify({ question }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async anomalyClassify(url: string, notes?: string) {
    const res = await fetch(`${API_BASE_URL}/ai/anomaly/classify`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify({ url, notes }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async captionImage(url: string, detail: 'short'|'detailed' = 'short') {
    const res = await fetch(`${API_BASE_URL}/ai/caption`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify({ url, detail }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async geofenceCheck(input: { lease: any; threshold?: number; report_id?: string }) {
    const res = await fetch(`${API_BASE_URL}/alerts/geofence/check`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async createAnnotation(input: { aoi: any; note?: string; severity?: string }) {
    const res = await fetch(`${API_BASE_URL}/collab/annotations`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async listAnnotations() {
    const res = await fetch(`${API_BASE_URL}/collab/annotations`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async integrityLog(payload: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL}/integrity/log`, { method: 'POST', headers: { ...withAuth({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async listIntegrityLogs() {
    const res = await fetch(`${API_BASE_URL}/integrity/logs`, { headers: withAuth() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async droneUpload(file: File, meta?: string) {
    const fd = new FormData(); fd.append('image', file); if (meta) fd.append('meta', meta);
    const res = await fetch(`${API_BASE_URL}/drone/upload`, { method: 'POST', headers: withAuth(), body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
