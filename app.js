// Estado global de la aplicación
const negocio = {
  nombre: "",
  lat: null,
  lng: null,
  menu: []
};

const PRECIO_POR_KM = 20;

// Geolocalización mediante API del navegador
function obtenerUbicacionNegocio() {
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat-negocio').value = pos.coords.latitude;
    document.getElementById('lng-negocio').value = pos.coords.longitude;
  });
}

function obtenerUbicacionCliente() {
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat-cliente').value = pos.coords.latitude;
    document.getElementById('lng-cliente').value = pos.coords.longitude;
  });
}

// Agregar items al menú del negocio
function agregarProducto() {
  const nombre = document.getElementById('prod-nombre').value;
  const precio = parseFloat(document.getElementById('prod-precio').value);

  if (!nombre || isNaN(precio)) {
    alert("Ingresa un nombre y precio válido");
    return;
  }

  const id = Date.now();
  negocio.menu.push({ id, nombre, precio });
  
  // Limpiar campos
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-precio').value = '';

  renderizarMenu();
}

function renderizarMenu() {
  const contenedor = document.getElementById('lista-menu');
  contenedor.innerHTML = '';

  negocio.menu.forEach(prod => {
    contenedor.innerHTML += `
      <div class="item-menu">
        <div>
          <strong>${prod.nombre}</strong><br>
          <small>$${prod.precio} MXN</small>
        </div>
        <input type="number" id="cant-${prod.id}" value="0" min="0">
      </div>
    `;
  });
}

// Calcular distancia usando la Fórmula de Haversine
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

// Cálculo final del pedido
function calcularTotal() {
  const latNegocio = parseFloat(document.getElementById('lat-negocio').value);
  const lngNegocio = parseFloat(document.getElementById('lng-negocio').value);
  const latCliente = parseFloat(document.getElementById('lat-cliente').value);
  const lngCliente = parseFloat(document.getElementById('lng-cliente').value);

  if (isNaN(latNegocio) || isNaN(latCliente)) {
    alert("Por favor asegúrate de ingresar las coordenadas de ambas ubicaciones.");
    return;
  }

  // 1. Calcular Subtotal de productos
  let subtotal = 0;
  negocio.menu.forEach(prod => {
    const cantidad = parseInt(document.getElementById(`cant-${prod.id}`).value) || 0;
    subtotal += cantidad * prod.precio;
  });

  if (subtotal === 0) {
    alert("Agrega al menos un producto al pedido.");
    return;
  }

  // 2. Calcular Distancia y Envío
  const distancia = calcularDistanciaKm(latNegocio, lngNegocio, latCliente, lngCliente);
  const costoEnvio = distancia * PRECIO_POR_KM;
  const totalFinal = subtotal + costoEnvio;

  // 3. Mostrar Resultados
  document.getElementById('distancia-km').innerText = distancia.toFixed(2);
  document.getElementById('costo-envio').innerText = costoEnvio.toFixed(2);
  document.getElementById('subtotal').innerText = subtotal.toFixed(2);
  document.getElementById('total-final').innerText = totalFinal.toFixed(2);
  
  document.getElementById('resumen').style.display = 'block';
}