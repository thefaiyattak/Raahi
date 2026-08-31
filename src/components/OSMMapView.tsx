import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from './AppIcon';
import { LatLng } from '../services/osmService';

export interface OSMMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  pinColor?: string;
  iconType?: 'driver' | 'passenger' | 'pickup' | 'dropoff';
}

export type MapStyleType = 'soft' | 'satellite' | 'dark' | 'standard';

interface OSMMapViewProps {
  initialCenter?: LatLng;
  initialZoom?: number;
  markers?: OSMMapMarker[];
  routeCoordinates?: LatLng[];
  onMapPress?: (coord: LatLng) => void;
  style?: any;
  interactive?: boolean;
  showControls?: boolean;
}

export const OSMMapView: React.FC<OSMMapViewProps> = ({
  initialCenter = { latitude: 33.6844, longitude: 73.0479 },
  initialZoom = 13,
  markers = [],
  routeCoordinates = [],
  onMapPress,
  style,
  interactive = true,
  showControls = true,
}) => {
  const webViewRef = useRef<any>(null);
  const [activeMapStyle, setActiveMapStyle] = useState<MapStyleType>('soft');

  const tileLayerUrls: Record<MapStyleType, { url: string; subdomains?: string[] }> = {
    // 100% Free OpenStreetMap Standard Tiles (No API key, No watermarks)
    soft: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
    },
    // Esri World Imagery (Free High-Res Satellite View)
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    },
    // Stadia / OpenStreetMap Dark Night Mode
    dark: {
      url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c'],
    },
    // Humanitarian OpenStreetMap (High-detail topography)
    standard: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
    },
  };

  const htmlContent = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    const routeJson = JSON.stringify(routeCoordinates);
    const tileConfig = tileLayerUrls[activeMapStyle];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: ${activeMapStyle === 'dark' ? '#111827' : '#F2F3F2'};
          }
          /* Smart Modern Sleek Pin */
          .smart-pin-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 40px;
          }
          .smart-pin {
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 2px solid #FFFFFF;
          }
          .smart-pin-inner {
            transform: rotate(45deg);
            width: 10px;
            height: 10px;
            background-color: #FFFFFF;
            border-radius: 50%;
          }
          .smart-pin-pulse {
            position: absolute;
            bottom: 2px;
            width: 12px;
            height: 6px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 50%;
            filter: blur(1px);
          }
          .leaflet-control-attribution {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            zoomControl: false,
            dragging: ${interactive},
            touchZoom: ${interactive},
            doubleClickZoom: ${interactive},
            scrollWheelZoom: ${interactive}
          }).setView([${initialCenter.latitude}, ${initialCenter.longitude}], ${initialZoom});

          let currentTileLayer = L.tileLayer('${tileConfig.url}', {
            maxZoom: 19,
            ${tileConfig.subdomains ? `subdomains: ${JSON.stringify(tileConfig.subdomains)},` : ''}
          }).addTo(map);

          let markerGroup = L.layerGroup().addTo(map);
          let polylineLayer = null;

          function renderMarkers(markerList) {
            markerGroup.clearLayers();
            markerList.forEach(m => {
              const bg = m.pinColor || (m.iconType === 'driver' ? '#2F9A3C' : m.iconType === 'pickup' ? '#2F9A3C' : '#E53935');
              
              const icon = L.divIcon({
                className: '',
                html: '<div class="smart-pin-wrapper">' +
                        '<div class="smart-pin-pulse"></div>' +
                        '<div class="smart-pin" style="background-color:' + bg + ';">' +
                          '<div class="smart-pin-inner"></div>' +
                        '</div>' +
                      '</div>',
                iconSize: [32, 40],
                iconAnchor: [16, 38],
                popupAnchor: [0, -36]
              });

              const leafletMarker = L.marker([m.latitude, m.longitude], { icon }).addTo(markerGroup);
              if (m.title || m.description) {
                leafletMarker.bindPopup('<b>' + (m.title || '') + '</b><br>' + (m.description || ''));
              }
            });
          }

          function renderRoute(coords) {
            if (polylineLayer) {
              map.removeLayer(polylineLayer);
              polylineLayer = null;
            }
            if (coords && coords.length > 0) {
              const latlngs = coords.map(c => [c.latitude, c.longitude]);
              polylineLayer = L.polyline(latlngs, {
                color: '#2F9A3C',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);
              map.fitBounds(polylineLayer.getBounds(), { padding: [50, 50] });
            }
          }

          renderMarkers(${markersJson});
          renderRoute(${routeJson});

          // Bridge message handlers for controls
          window.addEventListener('message', function(e) {
            try {
              const msg = JSON.parse(e.data);
              if (msg.action === 'zoom_in') {
                map.zoomIn();
              } else if (msg.action === 'zoom_out') {
                map.zoomOut();
              } else if (msg.action === 'center_loc') {
                map.flyTo([msg.lat, msg.lng], 15, { animate: true, duration: 1 });
              }
            } catch(err) {}
          });

          ${
            onMapPress
              ? `
          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'map_press',
              latitude: e.latlng.lat,
              longitude: e.latlng.lng
            }));
          });
          `
              : ''
          }
        </script>
      </body>
      </html>
    `;
  }, [initialCenter, initialZoom, markers, routeCoordinates, interactive, onMapPress, activeMapStyle]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_press' && onMapPress) {
        onMapPress({ latitude: data.latitude, longitude: data.longitude });
      }
    } catch (e) {
      console.warn('Failed to parse webview message', e);
    }
  };

  const handleZoomIn = () => {
    webViewRef.current?.postMessage(JSON.stringify({ action: 'zoom_in' }));
  };

  const handleZoomOut = () => {
    webViewRef.current?.postMessage(JSON.stringify({ action: 'zoom_out' }));
  };

  const handleLocateMe = () => {
    // Center to initial location or Islamabad center
    webViewRef.current?.postMessage(
      JSON.stringify({
        action: 'center_loc',
        lat: markers[0]?.latitude || initialCenter.latitude,
        lng: markers[0]?.longitude || initialCenter.longitude,
      })
    );
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F9A3C" />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
      />

      {/* Floating Map Theme Switcher & Interactive Controls */}
      {showControls && (
        <>
          {/* Top-Right Theme Layer Selector */}
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[styles.themeChip, activeMapStyle === 'soft' && styles.themeChipActive]}
              onPress={() => setActiveMapStyle('soft')}
              activeOpacity={0.8}
            >
              <Icon name="palette" size={13} color={activeMapStyle === 'soft' ? '#FFFFFF' : '#262A27'} />
              <Text style={[styles.themeChipText, activeMapStyle === 'soft' && styles.themeChipTextActive]}>
                Soft UI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeChip, activeMapStyle === 'satellite' && styles.themeChipActive]}
              onPress={() => setActiveMapStyle('satellite')}
              activeOpacity={0.8}
            >
              <Icon name="earth" size={13} color={activeMapStyle === 'satellite' ? '#FFFFFF' : '#262A27'} />
              <Text style={[styles.themeChipText, activeMapStyle === 'satellite' && styles.themeChipTextActive]}>
                Satellite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeChip, activeMapStyle === 'dark' && styles.themeChipActive]}
              onPress={() => setActiveMapStyle('dark')}
              activeOpacity={0.8}
            >
              <Icon name="weather-night" size={13} color={activeMapStyle === 'dark' ? '#FFFFFF' : '#262A27'} />
              <Text style={[styles.themeChipText, activeMapStyle === 'dark' && styles.themeChipTextActive]}>
                Dark
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right Floating Control Bar (+, -, Locate Me) */}
          <View style={styles.controlsColumn}>
            <TouchableOpacity style={styles.controlButton} onPress={handleLocateMe} activeOpacity={0.85}>
              <Icon name="crosshairs-gps" size={18} color="#2F9A3C" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.85}>
              <Icon name="plus" size={18} color="#262A27" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut} activeOpacity={0.85}>
              <Icon name="minus" size={18} color="#262A27" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#F2F3F2',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F2F3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSelectorRow: {
    position: 'absolute',
    top: 14,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  themeChipActive: {
    backgroundColor: '#2F9A3C',
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#262A27',
  },
  themeChipTextActive: {
    color: '#FFFFFF',
  },
  controlsColumn: {
    position: 'absolute',
    bottom: 16,
    right: 14,
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
