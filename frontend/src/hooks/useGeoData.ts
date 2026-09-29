import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { API_BASE_URL } from "../config/api";

interface UseGeoDataResult {
  data: FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch a GeoJSON layer from the backend by name.
 *
 * @param layerName  – must match a .geojson filename in backend/data/
 * @param enabled    – skip fetch when false (layer toggled off before load)
 */
export function useGeoData(
  layerName: string,
  enabled: boolean = true
): UseGeoDataResult {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/geodata/${layerName}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json as FeatureCollection);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layerName, enabled]);

  return { data, loading, error };
}
