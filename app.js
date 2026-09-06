const negocio = {
  menu: []
};

const PRECIO_POR_KM = 20;

// Geocodificación Inversa: GPS -> Llenar campos de Dirección
function autocompletarDireccion(lat, lng, prefix) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then(res => res.json())
    .then(data => {
      const addr = data.address || {};
      document.getElementById(`${prefix}-calle`).value = addr.road || addr.pedestrian || '';
      document.getElementById(`${prefix}-numero`).value = addr.house_number || '';
      document.getElementById(`${prefix}-colonia`).value = addr.suburb || addr.neighbourhood || '';
      document.getElementById(`${prefix}-cp`).value = addr.postcode || '';
      document.getElementById(`${prefix}-municipio`).value = addr.city || addr.town || addr.village || '';
    })
    .catch(() => alert("No se pudo autocompletar la dirección exacta desde el GPS."));
}

function obtenerUbicacionNegocio() {
  navigator.geolocation.getCurrentPosition(pos => {
    autocompletarDireccion(pos.coords.latitude, pos.coords.longitude, 'negocio');
  });
}

function obtenerUbicacionCliente() {
  navigator.geolocation.getCurrentPosition(pos => {
    autocompletarDireccion(pos.coords.latitude, pos.coords.longitude, 'cliente');
  });
}

// Geocodificación Directa: Texto de Dirección -> Coordenadas (Lat, Lng)
async function obtenerCoordenadasDeDireccion(prefix) {
  const calle = document.getElementById(`${prefix}-calle`).value;
  const numero = document.getElementById(`${prefix}-numero`).value;
  const colonia = document.getElementById(`${prefix}-colonia`).value;
  const cp = document.getElementById(`${prefix}-cp`).value;
  const municipio = document.getElementById(`${prefix}-municipio`).value;

  if (!calle || !municipio) {
    alert(`Por favor completa al menos la Calle y Municipio en la dirección de ${prefix}.`);
    return null;
  }

  const query = encodeURIComponent(`${calle} ${numero}, ${colonia}, ${cp} ${municipio}`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } else {
      alert(`No se encontró la ubicación de ${prefix}. Verifica la dirección.`);
      return null;
    }
  } catch (error) {
    alert("Error al buscar la dirección.");
    return null;
  }
}

// Agregar items al menú
function agregarProducto() {
  const nombre = document.getElementById('prod-nombre').value;
  const precio = parseFloat(document.getElementById('prod-precio').value);

  if (!nombre || isNaN(precio)) {
    alert("Ingresa un nombre y precio válido");
    return;
  }

  const id = Date.now();
  negocio.menu.push({ id, nombre, precio });
  
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

// Fórmula de Haversine para calcular distancia en KM
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

// Cálculo final del pedido
async function calcularTotal() {
  // 1. Obtener Coordenadas de ambas direcciones
  const coordNegocio = await obtenerCoordenadasDeDireccion('negocio');
  if (!coordNegocio) return;

  const coordCliente = await obtenerCoordenadasDeDireccion('cliente');
  if (!coordCliente) return;

  // 2. Subtotal Productos
  let subtotal = 0;
  negocio.menu.forEach(prod => {
    const cantidad = parseInt(document.getElementById(`cant-${prod.id}`).value) || 0;
    subtotal += cantidad * prod.precio;
  });

  if (subtotal === 0) {
    alert("Agrega al menos un producto al pedido.");
    return;
  }

  // 3. Distancia y Envío
  const distancia = calcularDistanciaKm(coordNegocio.lat, coordNegocio.lng, coordCliente.lat, coordCliente.lng);
  const costoEnvio = distancia * PRECIO_POR_KM;
  const totalFinal = subtotal + costoEnvio;

  // 4. Mostrar Desglose
  document.getElementById('distancia-km').innerText = distancia.toFixed(2);
  document.getElementById('costo-envio').innerText = costoEnvio.toFixed(2);
  document.getElementById('subtotal').innerText = subtotal.toFixed(2);
  document.getElementById('total-final').innerText = totalFinal.toFixed(2);
  
  document.getElementById('resumen').style.display = 'block';
}

// Variable global para almacenar el último pedido calculado
let ultimoPedido = null;

// Reemplazar la función calcularTotal() con la siguiente versión que guarda el estado del pedido:
async function calcularTotal() {
  const coordNegocio = await obtenerCoordenadasDeDireccion('negocio');
  if (!coordNegocio) return;

  const coordCliente = await obtenerCoordenadasDeDireccion('cliente');
  if (!coordCliente) return;

  // Extraer dirección completa del cliente
  const direccionCliente = {
    calle: document.getElementById('cliente-calle').value,
    numero: document.getElementById('cliente-numero').value,
    colonia: document.getElementById('cliente-colonia').value,
    cp: document.getElementById('cliente-cp').value,
    municipio: document.getElementById('cliente-municipio').value
  };

  // Recopilar items seleccionados
  let subtotal = 0;
  const itemsOrdenados = [];

  negocio.menu.forEach(prod => {
    const cantidad = parseInt(document.getElementById(`cant-${prod.id}`).value) || 0;
    if (cantidad > 0) {
      const costoItem = cantidad * prod.precio;
      subtotal += costoItem;
      itemsOrdenados.push({
        nombre: prod.nombre,
        cantidad: cantidad,
        precioUnitario: prod.precio,
        total: costoItem
      });
    }
  });

  if (itemsOrdenados.length === 0) {
    alert("Agrega al menos un producto al pedido.");
    return;
  }

  const distancia = calcularDistanciaKm(coordNegocio.lat, coordNegocio.lng, coordCliente.lat, coordCliente.lng);
  const costoEnvio = distancia * PRECIO_POR_KM;
  const totalFinal = subtotal + costoEnvio;

  // Guardar datos en la variable global para el envío
  ultimoPedido = {
    nombreNegocio: document.getElementById('nombre-negocio').value || "el restaurante",
    items: itemsOrdenados,
    distancia: distancia.toFixed(2),
    costoEnvio: costoEnvio.toFixed(2),
    subtotal: subtotal.toFixed(2),
    totalFinal: totalFinal.toFixed(2),
    direccion: direccionCliente
  };

  // Mostrar Desglose en pantalla
  document.getElementById('distancia-km').innerText = ultimoPedido.distancia;
  document.getElementById('costo-envio').innerText = ultimoPedido.costoEnvio;
  document.getElementById('subtotal').innerText = ultimoPedido.subtotal;
  document.getElementById('total-final').innerText = ultimoPedido.totalFinal;
  
  document.getElementById('resumen').style.display = 'block';
}

// Nueva función para enviar el resumen formateado a WhatsApp
function enviarPedidoWhatsApp() {
  if (!ultimoPedido) {
    alert("Primero debes calcular el total de tu pedido.");
    return;
  }

  // Número de teléfono del negocio (Opcional: cambiar '5210000000000' por el teléfono real)
  const telefonoNegocio = ""; 

  const d = ultimoPedido.direccion;
  const direccionFormateada = `${d.calle} #${d.numero}, Col. ${d.colonia}, C.P. ${d.cp}, ${d.municipio}`;

  let mensaje = `*¡Nuevo Pedido!* 🛒\n`;
  mensaje += `*Negocio:* ${ultimoPedido.nombreNegocio}\n\n`;
  mensaje += `*--- DETALLE DEL PEDIDO ---*\n`;

  ultimoPedido.items.forEach(item => {
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${item.total} MXN\n`;
  });

  mensaje += `\n*Subtotal:* $${ultimoPedido.subtotal} MXN\n`;
  mensaje += `*Envío (${ultimoPedido.distancia} km):* $${ultimoPedido.costoEnvio} MXN\n`;
  mensaje += `*TOTAL A PAGAR:* $${ultimoPedido.totalFinal} MXN\n\n`;
  mensaje += `*--- DIRECCIÓN DE ENTREGA ---*\n`;
  mensaje += `📍 ${direccionFormateada}\n`;

  const url = `https://api.whatsapp.com/send?phone=${telefonoNegocio}&text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
}