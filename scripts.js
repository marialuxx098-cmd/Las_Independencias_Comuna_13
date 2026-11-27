/* ============ TEMA CLARO / OSCURO ============ */
var themeToggle = document.getElementById('themeToggle');
var temaActual = 'light';
try {
  temaActual = localStorage.getItem('geovisor-theme') === 'dark' ? 'dark' : 'light';
} catch (error) { /* Se mantiene el tema claro si el almacenamiento está bloqueado. */ }

function aplicarTema(tema) {
  temaActual = tema === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = temaActual;
  document.documentElement.style.colorScheme = temaActual;
  var oscuro = temaActual === 'dark';
  var titulo = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  themeToggle.title = titulo;
  themeToggle.setAttribute('aria-label', titulo);
  themeToggle.setAttribute('aria-pressed', String(oscuro));
  themeToggle.innerHTML = oscuro
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/></svg>';
  try { localStorage.setItem('geovisor-theme', temaActual); } catch (error) { /* Preferencia solo durante esta sesión. */ }
}
aplicarTema(temaActual);
themeToggle.onclick = function () { aplicarTema(temaActual === 'dark' ? 'light' : 'dark'); };

/* ============ MAPA Y MAPAS BASE ============ */
var INITIAL_MAP_VIEW = { center: [6.24, -75.58], zoom: 13 };
var map = L.map('map', { zoomControl: false }).setView(INITIAL_MAP_VIEW.center, INITIAL_MAP_VIEW.zoom);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

var Stadia_AlidadeSatellite = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
  minZoom: 0, maxZoom: 20, ext: 'jpg',
  attribution: '&copy; CNES, Airbus DS, PlanetObserver | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});
var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});
var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});

var basemaps = [
  { name: 'Calles', layer: Esri_WorldStreetMap },
  { name: 'Imágenes', layer: Esri_WorldImagery },
  { name: 'Satélite', layer: Stadia_AlidadeSatellite }
];
var currentBase = null;
var currentBaseIndex = 0;
function setBase(i) {
  if (currentBase) map.removeLayer(currentBase);
  currentBaseIndex = i;
  currentBase = basemaps[i].layer.addTo(map);
  currentBase.bringToBack();
  document.querySelectorAll('#basemaps button').forEach(function (b, k) { b.classList.toggle('active', k === i); });
}
basemaps.forEach(function (b, i) {
  var btn = document.createElement('button');
  btn.textContent = b.name;
  btn.onclick = function () { setBase(i); };
  document.getElementById('basemaps').appendChild(btn);
});
setBase(2);

/* ============ CONTROLES DEL MAPA ============ */
var identifyMode = false;
var identifyButton;
var fullscreenButton;
var homeControl = L.control({ position: 'topright' });
homeControl.onAdd = function () {
  var group = L.DomUtil.create('div', 'leaflet-bar atlas-map-actions');
  var homeButton = L.DomUtil.create('button', 'atlas-map-action', group);
  homeButton.type = 'button';
  homeButton.title = 'Volver a la vista inicial';
  homeButton.setAttribute('aria-label', homeButton.title);
  homeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z"/></svg>';
  homeButton.onclick = function () { map.setView(INITIAL_MAP_VIEW.center, INITIAL_MAP_VIEW.zoom); };
  identifyButton = L.DomUtil.create('button', 'atlas-map-action', group);
  identifyButton.type = 'button';
  identifyButton.title = 'Identificar elementos geográficos';
  identifyButton.setAttribute('aria-label', identifyButton.title);
  identifyButton.setAttribute('aria-pressed', 'false');
  identifyButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5M10.8 7.5v6.6M7.5 10.8h6.6"/></svg>';
  identifyButton.onclick = function () {
    identifyMode = !identifyMode;
    if (identifyMode) {
      cancelar();
      if (streetViewPanel.classList.contains('open')) cerrarStreetView();
    }
    identifyButton.classList.toggle('active', identifyMode);
    identifyButton.setAttribute('aria-pressed', String(identifyMode));
    identifyButton.title = identifyMode ? 'Haz clic en una capa activa para consultar sus atributos' : 'Identificar elementos geográficos';
    identifyButton.setAttribute('aria-label', identifyButton.title);
    map.getContainer().style.cursor = identifyMode ? 'help' : '';
  };
  fullscreenButton = L.DomUtil.create('button', 'atlas-map-action', group);
  fullscreenButton.type = 'button';
  fullscreenButton.title = 'Activar pantalla completa';
  fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
  fullscreenButton.setAttribute('aria-pressed', 'false');
  fullscreenButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
  fullscreenButton.onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (map.getContainer().requestFullscreen) map.getContainer().requestFullscreen();
  };
  L.DomEvent.disableClickPropagation(group);
  L.DomEvent.disableScrollPropagation(group);
  return group;
};
homeControl.addTo(map);
document.addEventListener('fullscreenchange', function () {
  var active = document.fullscreenElement === map.getContainer();
  window.setTimeout(function () { map.invalidateSize({ pan: false }); }, 100);
  if (!fullscreenButton) return;
  fullscreenButton.classList.toggle('active', active);
  fullscreenButton.setAttribute('aria-pressed', String(active));
  fullscreenButton.title = active ? 'Salir de pantalla completa' : 'Activar pantalla completa';
  fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
});

var legendControl = L.control({ position: 'bottomright' });
legendControl.onAdd = function () {
  var legend = L.DomUtil.create('section', 'atlas-legend');
  legend.setAttribute('aria-label', 'Leyenda de capas activas');
  legend.innerHTML = '<strong>Capas activas</strong><ul></ul>';
  L.DomEvent.disableClickPropagation(legend);
  L.DomEvent.disableScrollPropagation(legend);
  return legend;
};
legendControl.addTo(map);
function renderLeyenda() {
  var legend = document.querySelector('.atlas-legend');
  if (!legend) return;
  var items = overlays.filter(function (entrada) { return entrada.on; });
  legend.classList.toggle('is-empty', items.length === 0);
  legend.querySelector('ul').innerHTML = items.map(function (entrada) {
    return '<li><span style="background:' + entrada.color + '"></span>' + entrada.nombre + '</li>';
  }).join('');
}

/* ============ PANEL DE CAPAS ============ */
var overlays = [];
var periodoSeleccionado = 2024;
var PERIODOS = [2006, 2014, 2024];
var ICON_ZOOM = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2M11 8v6M8 11h6"/></svg>';
var geoTIFFActivoId = null;

function retirarGeoTIFFActivos() {
  overlays.forEach(function (entrada) {
    if (!entrada.esGeoTIFF) return;
    entrada.on = false;
    map.removeLayer(entrada.layer);
  });
  var capasMapa = [];
  map.eachLayer(function (layer) {
    if (layer._atlasGeoTIFF) capasMapa.push(layer);
  });
  capasMapa.forEach(function (layer) { map.removeLayer(layer); });
  geoTIFFActivoId = null;
}

function sincronizarGeoTIFFActivo() {
  var activa = overlays.find(function (entrada) {
    return entrada.esGeoTIFF && entrada.id === geoTIFFActivoId && entrada.on && entrada.periodo === periodoSeleccionado;
  });
  var capasAjena = [];
  map.eachLayer(function (layer) {
    if (!layer._atlasGeoTIFF) return;
    if (!activa || layer !== activa.layer) capasAjena.push(layer);
  });
  capasAjena.forEach(function (layer) { map.removeLayer(layer); });
  overlays.forEach(function (entrada) {
    if (entrada.esGeoTIFF && (!activa || entrada !== activa)) {
      entrada.on = false;
      map.removeLayer(entrada.layer);
    }
  });
}
map.on('zoomend', sincronizarGeoTIFFActivo);

function registrar(id, nombre, layer, color, getBounds) {
  var e = { id: id, nombre: nombre, layer: layer, color: color, on: map.hasLayer(layer), opacity: 1, getBounds: getBounds, disponible: true, nota: '' };
  overlays.push(e);
  return e;
}

function aplicarOpacidad(entrada) {
  var opacidad = entrada.opacity;
  function aplicar(featureLayer) {
    if (featureLayer.setOpacity) featureLayer.setOpacity(opacidad);
    if (featureLayer.setStyle && (featureLayer.getLatLng || featureLayer.getLatLngs)) {
      if (featureLayer._atlasBaseOpacity === undefined) {
        featureLayer._atlasBaseOpacity = featureLayer.options.opacity === undefined ? 1 : featureLayer.options.opacity;
        featureLayer._atlasBaseFillOpacity = featureLayer.options.fillOpacity === undefined ? 0.2 : featureLayer.options.fillOpacity;
      }
      featureLayer.setStyle({
        opacity: featureLayer._atlasBaseOpacity * opacidad,
        fillOpacity: featureLayer._atlasBaseFillOpacity * opacidad
      });
    }
    if (featureLayer.eachLayer) featureLayer.eachLayer(aplicar);
  }
  if (entrada.layer.setOpacity) entrada.layer.setOpacity(opacidad);
  if (entrada.layer.eachLayer) entrada.layer.eachLayer(aplicar);
}

function renderCapas() {
  var ul = document.getElementById('layerList');
  ul.innerHTML = '';
  overlays.forEach(function (e) {
    if (e.periodo && e.periodo !== periodoSeleccionado) return;
    var li = document.createElement('li');
    li.className = (e.on ? '' : 'off ') + (e.disponible ? '' : 'na');
    li.innerHTML =
      '<span class="sw-color" style="background:' + e.color + '"></span>' +
      '<div class="layer-info"><span class="lname">' + e.nombre + (e.archivo ? '<small>' + e.archivo + '</small>' : '') + (e.nota ? '<small>' + e.nota + '</small>' : '') + '</span>' +
      '<label class="opacity-control"><span>Opacidad <output>' + Math.round(e.opacity * 100) + '%</output></span>' +
      '<input class="opacity-range" type="range" min="0" max="100" value="' + Math.round(e.opacity * 100) + '" aria-label="Opacidad de ' + e.nombre + '"></label></div>' +
      '<button class="zoom" title="Ir a la capa">' + ICON_ZOOM + '</button>' +
      '<button class="switch" role="switch" aria-checked="' + e.on + '" ' + (e.disponible ? '' : 'disabled') + ' title="Activar / desactivar"></button>';
    li.querySelector('.opacity-range').oninput = function (event) {
      e.opacity = Number(event.target.value) / 100;
      li.querySelector('output').textContent = event.target.value + '%';
      aplicarOpacidad(e);
    };
    li.querySelector('.switch').onclick = function () {
      if (e.esGeoTIFF) {
        if (e.on) {
          e.on = false;
          map.removeLayer(e.layer);
          if (geoTIFFActivoId === e.id) geoTIFFActivoId = null;
        } else {
          retirarGeoTIFFActivos();
          e.on = true;
          geoTIFFActivoId = e.id;
          if (e.datosCargados) {
            map.addLayer(e.layer);
            var rasterBounds = e.getBounds && e.getBounds();
            if (rasterBounds && rasterBounds.isValid()) map.fitBounds(rasterBounds, { padding: [60, 60], maxZoom: 18 });
          } else {
            e.cargar();
          }
        }
        renderCapas();
        return;
      }
      e.on = !e.on;
      if (e.on) {
        map.addLayer(e.layer);
        var bounds = e.getBounds ? e.getBounds() : (e.layer.getBounds && e.layer.getBounds());
        if (bounds && bounds.isValid && bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
      } else {
        map.removeLayer(e.layer);
      }
      renderCapas();
    };
    li.querySelector('.zoom').onclick = function () {
      var b = e.getBounds ? e.getBounds() : (e.layer.getBounds && e.layer.getBounds());
      if (b && b.isValid && b.isValid()) map.fitBounds(b, { padding: [60, 60], maxZoom: 18 });
    };
    ul.appendChild(li);
  });
  var visibles = overlays.filter(function (e) { return !e.periodo || e.periodo === periodoSeleccionado; });
  document.getElementById('count').textContent =
    visibles.filter(function (e) { return e.on; }).length + ' de ' + visibles.length + ' activas';
  renderLeyenda();
}
document.getElementById('panelToggle').onclick = function () {
  document.getElementById('panel').classList.toggle('collapsed');
};

/* ============ SHAPEFILES (.zip) ============ */
function mostrarAtributos(feature, layer) {
  if (!layer) return;

  var propiedades = feature && feature.properties &&
    typeof feature.properties === 'object' ? feature.properties : {};
  var contenido = document.createElement('div');
  contenido.className = 'popup-atributos';
  var tabla = document.createElement('table');

  Object.entries(propiedades).forEach(function (par) {
    var fila = document.createElement('tr');
    var nombre = document.createElement('th');
    var valor = document.createElement('td');
    nombre.textContent = String(par[0]);
    if (par[1] === null || par[1] === undefined || par[1] === '') {
      valor.textContent = 'Sin informaci\u00f3n';
    } else if (typeof par[1] === 'object') {
      try { valor.textContent = JSON.stringify(par[1]); }
      catch (e) { valor.textContent = String(par[1]); }
    } else {
      valor.textContent = String(par[1]);
    }
    fila.appendChild(nombre);
    fila.appendChild(valor);
    tabla.appendChild(fila);
  });

  contenido.appendChild(tabla);
  layer.bindPopup(contenido, {
    minWidth: 340,
    maxWidth: 560,
    maxHeight: 460,
    autoPan: true
  });
}

var capasShape = [
  { id: 'limite-barrios', archivo: 'LIMITE_BARRIO.zip', nombre: 'Limite de barrios', color: '#3b6ea5' },
  { id: 'equipamientos', archivo: 'EQUIPAMIENTOS.zip', nombre: 'Equipamientos 2024', color: '#b08d57' },
  { id: 'espacio-publico-2006', archivo: 'ESPACIO_PUBLICO_2006.zip', nombre: 'Espacio publico 2006', color: '#a05a5a', periodo: 2006 },
  { id: 'espacio-publico-2014', archivo: 'ESPACIO_PUBLICO_2014.zip', nombre: 'Espacio publico 2014', color: '#5e8b7e', periodo: 2014 },
  { id: 'espacio-publico-2024', archivo: 'ESPACIO_PUBLICO_2024.zip', nombre: 'Espacio publico 2024', color: '#8064a2', periodo: 2024 },
  { id: 'buffer-2006', archivo: 'BUFFER_2006.zip', nombre: 'Buffer espacio publico 2006', color: '#d46a6a', periodo: 2006 },
  { id: 'buffer-2014', archivo: 'BUFFER_2014.zip', nombre: 'Buffer espacio publico 2014', color: '#42a58a', periodo: 2014 },
  { id: 'buffer-2024', archivo: 'BUFFER_2024.zip', nombre: 'Buffer espacio publico 2024', color: '#ed9b35', periodo: 2024 }
];

capasShape.forEach(function (config) {
  var layer = L.geoJSON(null, {
    style: function () { return { color: config.color, weight: 2, fillColor: config.color, fillOpacity: 0.25 }; },
    pointToLayer: function (feature, latlng) { return L.circleMarker(latlng, { radius: 5, color: config.color, fillColor: config.color, fillOpacity: 0.8 }); },
    onEachFeature: mostrarAtributos
  });
  var entrada = registrar(config.id, config.nombre, layer, config.color);
  entrada.periodo = config.periodo || null;
  entrada.nota = 'Cargando...';
  var url = new URL('./data/' + config.archivo, document.baseURI);
  fetch(url.href)
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' al leer ' + url.pathname);
      return response.arrayBuffer();
    })
    .then(function (buffer) { return shp(buffer); })
    .then(function (resultados) {
      var colecciones = Array.isArray(resultados) ? resultados
        : (resultados && resultados.type === 'FeatureCollection' ? [resultados]
          : Object.keys(resultados || {}).map(function (key) { return resultados[key]; }));
      colecciones = colecciones.filter(function (fc) { return fc && fc.type === 'FeatureCollection'; });
      if (!colecciones.length) throw new Error('El ZIP no contiene entidades Shapefile válidas');
      var totalEntidades = colecciones.reduce(function (total, fc) {
        return total + (Array.isArray(fc.features) ? fc.features.length : 0);
      }, 0);
      if (!totalEntidades) throw new Error('El Shapefile no contiene entidades');
      colecciones.forEach(function (fc) { layer.addData(fc); });
      aplicarOpacidad(entrada);
      entrada.datosCargados = true;
      entrada.nota = '';
      actualizarDashboardCapas();
      if (entrada.on) map.addLayer(layer);
      if (entrada.periodo === periodoSeleccionado) enfocarPeriodo(periodoSeleccionado);
      renderCapas();
    })
    .catch(function (err) {
      console.error('No se pudo cargar ' + config.archivo + ':', err);
      entrada.nota = 'Error: ' + (err && err.message ? err.message : String(err));
      entrada.disponible = false;
      entrada.on = false; map.removeLayer(layer);
      renderCapas();
    });
});

/* ============ IMAGENES GEORREFERENCIADAS (GEOTIFF) ============ */
// Los TIFF guardan EPSG:9377 (MAGNA-SIRGAS 2018 / Origen-Nacional).
// Registrar su definicion exacta permite reproyectarlos al CRS del mapa (EPSG:3857).
if (typeof proj4 !== 'undefined') {
  proj4.defs('EPSG:9377', '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
}

var imagenesGeoTIFF = [
  { id: 'geotiff-2006', archivo: 'La_independencia2006.tif', nombre: 'Imagen GeoTIFF 2006', color: '#c46b54', periodo: 2006, ancho: 8173, alto: 5519 },
  { id: 'geotiff-2014', archivo: 'La_independencia2014.tif', nombre: 'Imagen GeoTIFF 2014', color: '#4c9b86', periodo: 2014, ancho: 8173, alto: 5461 },
  { id: 'geotiff-2024', archivo: 'Las_Independencias_2024.tif', nombre: 'Imagen GeoTIFF 2024', color: '#d39b3d', periodo: 2024, ancho: 8192, alto: 5479 }
];

imagenesGeoTIFF.forEach(function (config) {
  var layer = L.layerGroup();
  var entrada = registrar(config.id, config.nombre, layer, config.color);
  entrada.periodo = config.periodo;
  entrada.esGeoTIFF = true;
  entrada.archivo = config.archivo;
  entrada.nota = 'Lista para cargar';
  entrada.cargando = false;
  entrada.cargar = function () {
    if (entrada.cargando || entrada.datosCargados) return;
    if (typeof parseGeoraster !== 'function' || typeof GeoRasterLayer !== 'function') {
      entrada.nota = 'No se cargaron las librerías GeoTIFF';
      entrada.disponible = false;
      entrada.on = false;
      renderCapas();
      return;
    }
    entrada.cargando = true;
    entrada.nota = 'Descargando TIFF...';
    renderCapas();
    var url = new URL('./data/rasters/' + config.archivo, document.baseURI);
    fetch(url.href, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' al leer ' + config.archivo);
      entrada.nota = 'Interpretando GeoTIFF...';
      renderCapas();
      return response.arrayBuffer();
    }).then(function (buffer) {
      return parseGeoraster(buffer);
    }).then(function (georaster) {
      if (georaster.width !== config.ancho || georaster.height !== config.alto) {
        throw new Error('El archivo recibido no coincide con el TIFF del periodo ' + config.periodo +
          ' (se esperaba ' + config.ancho + 'x' + config.alto + ' y llegó ' + georaster.width + 'x' + georaster.height + ')');
      }
      var noData = Number(georaster.noDataValue);
      var rasterLayer = new GeoRasterLayer({
        georaster: georaster,
        opacity: entrada.opacity,
        resolution: 128,
        pixelValuesToColorFn: function (values) {
          var canales = values.slice(0, 3);
          if (!canales.length || canales.some(function (value) { return !Number.isFinite(value); })) return null;
          if ((Number.isFinite(noData) && values.every(function (value) { return value === noData; })) ||
              (canales.length === 3 && canales.every(function (value) { return value === 255; }))) return null;
          var maximos = georaster.maxs || [];
          var minimos = georaster.mins || [];
          canales = canales.map(function (value, index) {
            var minimo = Number(minimos[index]);
            var maximo = Number(maximos[index]);
            if (maximo > 255 && Number.isFinite(minimo) && Number.isFinite(maximo) && maximo > minimo) {
              return Math.max(0, Math.min(255, Math.round((value - minimo) * 255 / (maximo - minimo))));
            }
            return Math.max(0, Math.min(255, Math.round(value)));
          });
          if (canales.length === 1) return 'rgb(' + canales[0] + ',' + canales[0] + ',' + canales[0] + ')';
          return 'rgb(' + canales[0] + ',' + canales[1] + ',' + canales[2] + ')';
        }
      });
      rasterLayer._atlasGeoTIFF = true;
      rasterLayer._atlasGeoTIFFPeriodo = config.periodo;
      rasterLayer._atlasGeoTIFFArchivo = config.archivo;
      entrada.layer = rasterLayer;
      entrada.getBounds = function () { return rasterLayer.getBounds(); };
      entrada.datosCargados = true;
      entrada.cargando = false;
      entrada.nota = '';
      if (entrada.on && entrada.periodo === periodoSeleccionado && geoTIFFActivoId === entrada.id) {
        sincronizarGeoTIFFActivo();
        map.addLayer(rasterLayer);
        var bounds = rasterLayer.getBounds();
        if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
      }
      renderCapas();
    }).catch(function (err) {
      console.error('No se pudo cargar ' + config.archivo + ':', err);
      entrada.cargando = false;
      entrada.nota = 'Error al cargar: ' + (err && err.message ? err.message : String(err));
      entrada.disponible = false;
      entrada.on = false;
      renderCapas();
    });
  };
});

function actualizarLineaTiempo(year) {
  periodoSeleccionado = year;
  retirarGeoTIFFActivos();
  overlays.forEach(function (entrada) {
    if (!entrada.periodo) return;
    entrada.on = false;
    map.removeLayer(entrada.layer);
  });
  var indice = PERIODOS.indexOf(year);
  document.getElementById('periodCurrent').textContent = year;
  document.getElementById('periodStatus').textContent = 'Activa capas abajo';
  document.querySelectorAll('#periodOptions [data-period]').forEach(function (button) {
    var active = Number(button.dataset.period) === year;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.getElementById('timelineProgress').style.width = (indice / (PERIODOS.length - 1) * 100) + '%';
  document.querySelectorAll('.timeline-track i').forEach(function (dot, i) { dot.classList.toggle('passed', i <= indice); });
  document.getElementById('periodPrev').disabled = indice === 0;
  document.getElementById('periodNext').disabled = indice === PERIODOS.length - 1;
  renderCapas();
  enfocarPeriodo(year);
}

function enfocarPeriodo(year) {
  var bounds = L.latLngBounds([]);
  overlays.forEach(function (entrada) {
    if (entrada.periodo !== year || !entrada.disponible || !entrada.layer.getBounds) return;
    var capaBounds = entrada.layer.getBounds();
    if (capaBounds && capaBounds.isValid()) bounds.extend(capaBounds);
  });
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [70, 70], maxZoom: 18 });
}

document.querySelectorAll('#periodOptions [data-period]').forEach(function (button) {
  button.onclick = function () { actualizarLineaTiempo(Number(button.dataset.period)); };
});
document.getElementById('periodPrev').onclick = function () {
  var index = PERIODOS.indexOf(periodoSeleccionado);
  if (index > 0) actualizarLineaTiempo(PERIODOS[index - 1]);
};
document.getElementById('periodNext').onclick = function () {
  var index = PERIODOS.indexOf(periodoSeleccionado);
  if (index < PERIODOS.length - 1) actualizarLineaTiempo(PERIODOS[index + 1]);
};
actualizarLineaTiempo(2024);

/* ============ DASHBOARD DE ATRIBUTOS ============ */
var dashboard = document.getElementById('dashboard');
var dashboardSelect = document.getElementById('dashboardLayer');
var dashboardTable = document.getElementById('dashboardTable');
var dashboardSummary = document.getElementById('dashboardSummary');
var dashboardState = document.getElementById('dashboardState');

function capasConDatos() {
  return overlays.filter(function (entrada) {
    return entrada.datosCargados && entrada.layer && entrada.id !== 'dibujos' && !entrada.esGeoTIFF;
  });
}

function actualizarDashboardCapas() {
  if (!dashboardSelect) return;
  var seleccionActual = dashboardSelect.value;
  var capas = capasConDatos();
  dashboardSelect.innerHTML = '';
  capas.forEach(function (entrada) {
    var opcion = document.createElement('option');
    opcion.value = entrada.id;
    opcion.textContent = entrada.nombre;
    dashboardSelect.appendChild(opcion);
  });
  if (!capas.length) {
    dashboardState.textContent = overlays.some(function (entrada) { return entrada.nota === 'Cargando...'; })
      ? 'Las capas se estan cargando. Espera un momento.'
      : 'No hay capas disponibles.';
    dashboardSummary.textContent = '';
    dashboardTable.replaceChildren();
    return;
  }
  dashboardSelect.value = capas.some(function (entrada) { return entrada.id === seleccionActual; })
    ? seleccionActual : capas[0].id;
  renderDashboardTabla();
}

function renderDashboardTabla() {
  var entrada = capasConDatos().find(function (capa) { return capa.id === dashboardSelect.value; });
  dashboardTable.replaceChildren();
  if (!entrada) {
    dashboardState.textContent = 'Selecciona una capa cargada para consultar sus atributos.';
    dashboardSummary.textContent = '';
    return;
  }
  var geojson = entrada.layer.toGeoJSON();
  var entidades = geojson && Array.isArray(geojson.features) ? geojson.features : [];
  var campos = [];
  entidades.forEach(function (entidad) {
    Object.keys(entidad.properties || {}).forEach(function (campo) {
      if (campos.indexOf(campo) === -1) campos.push(campo);
    });
  });
  dashboardSummary.textContent = entidades.length + (entidades.length === 1 ? ' registro' : ' registros');
  dashboardState.textContent = campos.length ? '' : 'Esta capa no tiene atributos disponibles.';
  if (!campos.length) return;

  var thead = document.createElement('thead');
  var filaCabecera = document.createElement('tr');
  campos.forEach(function (campo) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = campo;
    filaCabecera.appendChild(th);
  });
  thead.appendChild(filaCabecera);
  var tbody = document.createElement('tbody');
  entidades.forEach(function (entidad) {
    var fila = document.createElement('tr');
    var propiedades = entidad.properties || {};
    campos.forEach(function (campo) {
      var td = document.createElement('td');
      var valor = propiedades[campo];
      if (valor === null || valor === undefined) td.textContent = '';
      else if (typeof valor === 'object') {
        try { td.textContent = JSON.stringify(valor); }
        catch (e) { td.textContent = String(valor); }
      } else td.textContent = String(valor);
      fila.appendChild(td);
    });
    tbody.appendChild(fila);
  });
  dashboardTable.appendChild(thead);
  dashboardTable.appendChild(tbody);
}

function cerrarDashboard() {
  dashboard.classList.remove('open');
  dashboard.setAttribute('aria-hidden', 'true');
  document.getElementById('dashboardBtn').focus();
}

document.getElementById('dashboardBtn').onclick = function () {
  actualizarDashboardCapas();
  dashboard.classList.add('open');
  dashboard.setAttribute('aria-hidden', 'false');
  dashboardSelect.focus();
};
document.getElementById('dashboardClose').onclick = cerrarDashboard;
dashboard.querySelectorAll('[data-dashboard-close]').forEach(function (elemento) {
  elemento.onclick = cerrarDashboard;
});
dashboardSelect.onchange = renderDashboardTabla;
document.addEventListener('keydown', function (evento) {
  if (evento.key === 'Escape' && dashboard.classList.contains('open')) cerrarDashboard();
});

/* ============ HERRAMIENTAS DE DIBUJO Y MEDICIÓN ============ */
var dibujos = L.featureGroup();
registrar('dibujos', 'Mis dibujos', dibujos, '#3b6ea5', function () { return dibujos.getBounds(); });
renderCapas();

var ESTILO = { color: '#3b6ea5', weight: 3, fillColor: '#3b6ea5', fillOpacity: 0.2 };
var ESTILO_MED = { color: '#b08d57', weight: 3, dashArray: '8 6', fillColor: '#b08d57', fillOpacity: 0.18 };
var HINTS = {
  point: 'Haz clic para colocar puntos',
  line: 'Clic para añadir vértices · doble clic para terminar',
  polygon: 'Clic para añadir vértices · doble clic para cerrar',
  dist: 'Clic para medir · doble clic para terminar',
  area: 'Clic para delimitar · doble clic para calcular el área'
};
var tool = null, pts = [], prev = null, vertices = null, tip = null, mouse = null;
var streetViewBtn = document.getElementById('streetViewBtn');
var streetViewPanel = document.getElementById('streetViewPanel');
var streetViewFrame = document.getElementById('streetViewFrame');
function cargarStreetView(latlng) {
  var lat = Number(latlng.lat).toFixed(6);
  var lng = Number(latlng.lng).toFixed(6);
  // URL clásica de Google Maps para el panorama incrustado; no requiere clave API.
  // `cbll` debe ir como par latitud,longitud en la URL clásica de panoramas.
  // `layer=c` activa la capa de Street View y `output=svembed` solicita el visor.
  streetViewFrame.src = 'https://www.google.com/maps?layer=c&cbll=' + lat + ',' + lng + '&cbp=12,0,,0,0&ie=UTF8&source=embed&output=svembed';
}
function abrirStreetView(latlng) {
  streetViewPanel.classList.add('open');
  streetViewPanel.setAttribute('aria-hidden', 'false');
  streetViewBtn.classList.add('active');
  streetViewBtn.setAttribute('aria-pressed', 'true');
  cargarStreetView(latlng || map.getCenter());
}
function cerrarStreetView() {
  streetViewPanel.classList.remove('open');
  streetViewPanel.setAttribute('aria-hidden', 'true');
  streetViewBtn.classList.remove('active');
  streetViewBtn.setAttribute('aria-pressed', 'false');
}
streetViewBtn.onclick = function () {
  if (tool) cancelar();
  if (identifyMode) {
    identifyMode = false;
    identifyButton.classList.remove('active');
    identifyButton.setAttribute('aria-pressed', 'false');
    identifyButton.title = 'Identificar elementos geográficos';
    identifyButton.setAttribute('aria-label', identifyButton.title);
  }
  map.getContainer().style.cursor = '';
  abrirStreetView(map.getCenter());
};
document.getElementById('streetViewCenter').onclick = function () { cargarStreetView(map.getCenter()); };
document.getElementById('streetViewClose').onclick = cerrarStreetView;

function fmtLong(m) { return m < 1000 ? m.toFixed(1) + ' m' : (m / 1000).toFixed(2) + ' km'; }
function fmtArea(a) { return (a < 1e6 ? a.toFixed(0) + ' m²' : (a / 1e6).toFixed(2) + ' km²') + ' · ' + (a / 1e4).toFixed(2) + ' ha'; }
function largo(p) { var s = 0; for (var i = 1; i < p.length; i++) s += p[i - 1].distanceTo(p[i]); return s; }
function area(p) {
  var r = Math.PI / 180, s = 0, n = p.length;
  if (n < 3) return 0;
  for (var i = 0; i < n; i++) { var a = p[i], b = p[(i + 1) % n]; s += (b.lng - a.lng) * r * (2 + Math.sin(a.lat * r) + Math.sin(b.lat * r)); }
  return Math.abs(s * 6378137 * 6378137 / 2);
}
function perim(p) { return largo(p.concat([p[0]])); }

function textoVivo(p) {
  if (tool === 'line' || tool === 'dist') return fmtLong(largo(p));
  if (tool === 'polygon' || tool === 'area') return p.length > 2 ? fmtArea(area(p)) : fmtLong(largo(p));
  return '';
}
function esPoligono() { return tool === 'polygon' || tool === 'area'; }
function esMedida() { return tool === 'dist' || tool === 'area'; }

function iniciar(t) {
  var igual = tool === t;
  cancelar();
  if (identifyMode) {
    identifyMode = false;
    identifyButton.classList.remove('active');
    identifyButton.setAttribute('aria-pressed', 'false');
    identifyButton.title = 'Identificar elementos geográficos';
    identifyButton.setAttribute('aria-label', identifyButton.title);
  }
  if (igual) return;
  tool = t;
  if (!dibujos._map) { map.addLayer(dibujos); overlays.forEach(function (e) { if (e.id === 'dibujos') e.on = true; }); renderCapas(); }
  vertices = L.layerGroup().addTo(map);
  map.getContainer().style.cursor = 'crosshair';
  map.doubleClickZoom.disable();
  document.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('active', b.dataset.tool === t); });
  document.getElementById('hintText').textContent = HINTS[t] + ' · Esc para cancelar';
  document.getElementById('hint').classList.add('show');
}

function limpiarTemporales() {
  [prev, vertices, tip].forEach(function (l) { if (l) map.removeLayer(l); });
  prev = vertices = tip = null; pts = [];
}
function cancelar() {
  limpiarTemporales();
  tool = null;
  map.getContainer().style.cursor = '';
  map.doubleClickZoom.enable();
  document.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('hint').classList.remove('show');
}

function actualizar(extra) {
  var p = extra ? pts.concat([extra]) : pts;
  if (!prev) prev = (esPoligono() ? L.polygon : L.polyline)(p, esMedida() ? ESTILO_MED : ESTILO).addTo(map);
  else prev.setLatLngs(p);
  if (esMedida() && p.length > 1) {
    if (!tip) tip = L.tooltip({ permanent: true, direction: 'right', offset: [14, 0], className: 'tt' }).addTo(map);
    tip.setLatLng(p[p.length - 1]).setContent(textoVivo(p));
  }
}

function ptoDibujado(ll) {
  var m = L.marker(ll).addTo(dibujos);
  m.bindPopup('<b>Punto</b><br>Lat: ' + ll.lat.toFixed(6) + '<br>Lon: ' + ll.lng.toFixed(6));
}

function finalizar() {
  if (!tool || tool === 'point') { cancelar(); return; }
  var min = esPoligono() ? 3 : 2;
  if (pts.length < min) { cancelar(); return; }
  var p = pts.slice(), medida = esMedida(), poli = esPoligono(), t = tool;
  var capa = (poli ? L.polygon : L.polyline)(p, medida ? ESTILO_MED : ESTILO).addTo(dibujos);
  var info;
  if (t === 'dist') info = '<b>Distancia</b><br>' + fmtLong(largo(p));
  else if (t === 'line') info = '<b>Línea</b><br>Longitud: ' + fmtLong(largo(p));
  else info = '<b>' + (t === 'area' ? 'Área medida' : 'Polígono') + '</b><br>Área: ' + fmtArea(area(p)) + '<br>Perímetro: ' + fmtLong(perim(p));
  capa.bindPopup(info);
  if (medida) capa.bindTooltip(t === 'dist' ? fmtLong(largo(p)) : fmtArea(area(p)), { permanent: true, direction: 'center', className: 'tt' });
  limpiarTemporales();
  vertices = L.layerGroup().addTo(map);
}

function puntoEnAnillo(anillo, punto) {
  var dentro = false;
  for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    var a = map.latLngToContainerPoint(anillo[i]);
    var b = map.latLngToContainerPoint(anillo[j]);
    if (distanciaSegmento(punto, a, b) <= 4) return true;
    if ((a.y > punto.y) !== (b.y > punto.y) &&
      punto.x < (b.x - a.x) * (punto.y - a.y) / ((b.y - a.y) || 0.000001) + a.x) dentro = !dentro;
  }
  return dentro;
}
function puntoEnPoligono(latlngs, punto) {
  if (!latlngs || !latlngs.length) return false;
  if (latlngs[0] instanceof L.LatLng) {
    if (!puntoEnAnillo(latlngs[0], punto)) return false;
    for (var i = 1; i < latlngs.length; i++) if (puntoEnAnillo(latlngs[i], punto)) return false;
    return true;
  }
  return latlngs.some(function (poligono) { return puntoEnPoligono(poligono, punto); });
}
function distanciaSegmento(punto, inicio, fin) {
  var dx = fin.x - inicio.x, dy = fin.y - inicio.y;
  var factor = dx || dy ? Math.max(0, Math.min(1, ((punto.x - inicio.x) * dx + (punto.y - inicio.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(punto.x - (inicio.x + factor * dx), punto.y - (inicio.y + factor * dy));
}
function lineaCerca(latlngs, punto, tolerancia) {
  if (!latlngs || !latlngs.length) return false;
  if (latlngs[0] instanceof L.LatLng) {
    for (var i = 1; i < latlngs.length; i++) {
      if (distanciaSegmento(punto, map.latLngToContainerPoint(latlngs[i - 1]), map.latLngToContainerPoint(latlngs[i])) <= tolerancia) return true;
    }
    return false;
  }
  return latlngs.some(function (linea) { return lineaCerca(linea, punto, tolerancia); });
}
function featureEnPunto(featureLayer, latlng, punto) {
  if (featureLayer.eachLayer && !featureLayer.getLatLngs && !featureLayer.getLatLng) {
    var encontrada = false;
    featureLayer.eachLayer(function (child) { if (!encontrada && featureEnPunto(child, latlng, punto)) encontrada = true; });
    return encontrada;
  }
  if (featureLayer.getLatLng) {
    var radio = featureLayer.options && featureLayer.options.radius ? featureLayer.options.radius + 5 : 10;
    return map.latLngToContainerPoint(featureLayer.getLatLng()).distanceTo(punto) <= radio;
  }
  if (featureLayer.getLatLngs) {
    var latlngs = featureLayer.getLatLngs();
    if (featureLayer instanceof L.Polygon) return puntoEnPoligono(latlngs, punto);
    return lineaCerca(latlngs, punto, 8);
  }
  return false;
}
function identificar(latlng) {
  var punto = map.latLngToContainerPoint(latlng);
  for (var i = overlays.length - 1; i >= 0; i--) {
    var entrada = overlays[i];
    if (!entrada.on || !map.hasLayer(entrada.layer) || !entrada.layer.getLayers) continue;
    var features = entrada.layer.getLayers();
    for (var j = features.length - 1; j >= 0; j--) {
      if (!featureEnPunto(features[j], latlng, punto)) continue;
      if (features[j].openPopup) features[j].openPopup(latlng);
      else if (entrada.layer.openPopup) entrada.layer.openPopup(latlng);
      return true;
    }
  }
  return false;
}

map.on('click', function (e) {
  if (streetViewPanel.classList.contains('open')) cargarStreetView(e.latlng);
  if (identifyMode) { identificar(e.latlng); return; }
  if (!tool) return;
  if (tool === 'point') { ptoDibujado(e.latlng); return; }
  pts.push(e.latlng);
  L.circleMarker(e.latlng, { radius: 4, color: '#fff', weight: 2, fillColor: esMedida() ? '#b08d57' : '#3b6ea5', fillOpacity: 1 }).addTo(vertices);
  actualizar();
});
map.on('dblclick', function () {
  if (!tool || tool === 'point') return;
  pts.pop();            // el doble clic suma un vértice repetido
  finalizar();
});
map.on('mousemove', function (e) {
  document.getElementById('coords').textContent = 'Lat: ' + e.latlng.lat.toFixed(6) + ' | Lon: ' + e.latlng.lng.toFixed(6);
  if (tool && tool !== 'point' && pts.length) actualizar(e.latlng);
});

document.querySelectorAll('[data-tool]').forEach(function (b) { b.onclick = function () { iniciar(b.dataset.tool); }; });
document.getElementById('finishBtn').onclick = finalizar;
document.getElementById('cancelBtn').onclick = cancelar;
document.getElementById('clearBtn').onclick = function () { dibujos.clearLayers(); };
document.addEventListener('keydown', function (e) {
  if (!tool) return;
  if (e.key === 'Escape') cancelar();
  else if (e.key === 'Enter') finalizar();
  else if (e.key === 'Backspace' && pts.length) { pts.pop(); vertices.removeLayer(vertices.getLayers().pop()); pts.length ? actualizar() : (map.removeLayer(prev), prev = null, tip && (map.removeLayer(tip), tip = null)); }
});

/* Menú plegable */
