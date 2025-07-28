// Variables globales para modo personalizado
let hostsPorSubred = [];
let subredActual = 0;
let maxHostsGlobal = 0;

// Actualiza habilitación de inputs según selección manual/auto para subredes y hosts
function actualizarModos() {
  const modoSubnets = document.getElementById("modoSubnets").value;
  const modoHosts = document.getElementById("modoHosts").value;

  const subnetField = document.getElementById("subnetCount");
  const hostField = document.getElementById("hostCount");
  const personalizadoContainer = document.getElementById("personalizadoContainer");

  // Manejar visibilidad del contenedor personalizado
  personalizadoContainer.style.display = modoHosts === "personalizado" ? "block" : "none";

  // Deshabilitar si modo es automático
  subnetField.disabled = (modoSubnets === "auto");
  hostField.disabled = (modoHosts === "manual" || modoHosts === "auto");

  subnetField.classList.toggle("disabled", subnetField.disabled);
  hostField.classList.toggle("disabled", hostField.disabled);

  // Limpiar inputs deshabilitados
  if (subnetField.disabled) subnetField.value = "";
  if (hostField.disabled) hostField.value = "";

  actualizarMaximos();

  // Inicializar modo personalizado si es necesario
  if (modoHosts === "personalizado") {
    generarSpinners();
  }
}

// Actualiza los valores máximos permitidos y muestra info en pantalla
function actualizarMaximos() {
  const ipInput = document.getElementById("ipInput").value.trim();
  const modoSubnets = document.getElementById("modoSubnets").value;
  const modoHosts = document.getElementById("modoHosts").value;

  const maxSubnetsInfo = document.getElementById("maxSubnetsInfo");
  const maxHostsInfo = document.getElementById("maxHostsInfo");

  if (!ipInput.includes("/")) {
    maxSubnetsInfo.textContent = "Máx: -";
    maxHostsInfo.textContent = "Máx: -";
    return;
  }

  const [ipStr, maskStr] = ipInput.split("/");
  const mask = parseInt(maskStr);

  if (!validarIp(ipStr) || isNaN(mask) || mask < 1 || mask > 30) {
    maxSubnetsInfo.textContent = "Máscara inválida";
    maxHostsInfo.textContent = "Máscara inválida";
    return;
  }

  const totalBits = 32 - mask;
  const maxSubnets = 2 ** totalBits;
  maxHostsGlobal = 2 ** totalBits - 2;

  if (modoSubnets === "manual") {
    maxSubnetsInfo.textContent = `Máx: ${maxSubnets}`;
  } else {
    maxSubnetsInfo.textContent = "Modo automático";
  }

  if (modoHosts === "manual") {
    maxHostsInfo.textContent = `Máx: ${maxHostsGlobal}`;
  } else if (modoHosts === "auto") {
    maxHostsInfo.textContent = "Modo automático";
  } else {
    maxHostsInfo.textContent = "Personalizado";
  }
}

// Generar spinners para modo personalizado
function generarSpinners() {
  const subnetCount = parseInt(document.getElementById("subnetCount").value) || 0;
  hostsPorSubred = new Array(subnetCount).fill(0);
  subredActual = 0;

  if (subnetCount > 0) {
    document.getElementById("subredActualLabel").textContent = `Subred 1`;
    document.getElementById("hostPersonalizado").value = "";
  }
}

// Cambiar subred actual en modo personalizado
function cambiarSubred(delta) {
  const subnetCount = hostsPorSubred.length;
  if (subnetCount === 0) return;

  subredActual = (subredActual + delta + subnetCount) % subnetCount;

  document.getElementById("subredActualLabel").textContent = `Subred ${subredActual + 1}`;
  document.getElementById("hostPersonalizado").value = hostsPorSubred[subredActual];
}

// Actualizar valor de hosts para subred actual
function actualizarHostSubred() {
  const valor = parseInt(document.getElementById("hostPersonalizado").value) || 0;
  hostsPorSubred[subredActual] = Math.max(valor, 0);
}

// Validar entradas para evitar números fuera de rango
function validarEntrada() {
  const modoSubnets = document.getElementById("modoSubnets").value;
  const modoHosts = document.getElementById("modoHosts").value;

  if (modoSubnets === "manual") {
    const subnetCount = parseInt(document.getElementById("subnetCount").value) || 0;
    const maxSubnetsText = document.getElementById("maxSubnetsInfo").textContent;
    const maxSubnets = parseInt(maxSubnetsText.match(/\d+/)) || Infinity;
    if (subnetCount > maxSubnets) {
      alert(`Número de subredes excede el máximo permitido (${maxSubnets}).`);
      document.getElementById("subnetCount").value = maxSubnets;
    }
  }

  if (modoHosts === "manual") {
    const hostCount = parseInt(document.getElementById("hostCount").value) || 0;
    const maxHostsText = document.getElementById("maxHostsInfo").textContent;
    const maxHosts = parseInt(maxHostsText.match(/\d+/)) || Infinity;
    if (hostCount > maxHosts) {
      alert(`Número de hosts excede el máximo permitido (${maxHosts}).`);
      document.getElementById("hostCount").value = maxHosts;
    }
  }
}

// Función principal para calcular subneteo
function calcular() {
  const ipInput = document.getElementById("ipInput").value.trim();
  const modoSubnets = document.getElementById("modoSubnets").value;
  const modoHosts = document.getElementById("modoHosts").value;
  const output = document.getElementById("output");

  if (!ipInput.includes("/")) {
    output.textContent = "Error: La IP debe incluir una máscara, como 192.168.1.0/24.";
    return;
  }

  const [ipStr, maskStr] = ipInput.split("/");
  const mask = parseInt(maskStr);

  if (!validarIp(ipStr) || isNaN(mask) || mask < 1 || mask > 30) {
    output.textContent = "Error: Dirección IP o máscara inválida.";
    return;
  }

  const ipInt = ipToInt(ipStr);
  const maskInt = maskToInt(mask);
  const networkInt = ipInt & maskInt;

  let result = `Red original: ${ipStr}/${mask} (${intToIp(maskInt)})\n`;

  // Subred completa sin dividir
  const totalBlockSize = 2 ** (32 - mask);
  const broadcast = networkInt + totalBlockSize - 1;
  result += `\nSubred completa (sin dividir):\n`;
  result += `  Dirección de red: ${intToIp(networkInt)}\n`;
  result += `  Broadcast: ${intToIp(broadcast)}\n`;
  result += `  Hosts posibles: ${totalBlockSize - 2}\n`;

  // Modo personalizado (hosts variables por subred - VLSM)
  if (modoHosts === "personalizado") {
    const subnetCount = parseInt(document.getElementById("subnetCount").value);
    if (!subnetCount || subnetCount < 1) {
      output.textContent = "Error: Ingresa un número válido de subredes.";
      return;
    }

    // Verificar que todos los valores sean válidos
    if (hostsPorSubred.length !== subnetCount || hostsPorSubred.some(h => isNaN(h) || h < 0)) {
      output.textContent = "Error: Ingresa valores válidos de hosts para todas las subredes.";
      return;
    }

    // Crear array de subredes con información necesaria
    let subnets = hostsPorSubred.map((hosts, index) => ({
      originalIndex: index,
      hosts: hosts,
      blockSize: Math.pow(2, Math.ceil(Math.log2(hosts + 2)))  // Tamaño de bloque mínimo requerido
    }));

    // Ordenar subredes por tamaño de bloque (descendente)
    subnets.sort((a, b) => b.blockSize - a.blockSize);

    const originalEnd = networkInt + totalBlockSize - 1;
    let freeRanges = [[networkInt, originalEnd]];  // Rangos libres disponibles
    let error = false;

    // Asignar direcciones a cada subred
    for (let subnet of subnets) {
      let assigned = false;

      for (let i = 0; i < freeRanges.length; i++) {
        const [start, end] = freeRanges[i];
        const rangeSize = end - start + 1;

        // Saltar si el rango es demasiado pequeño
        if (rangeSize < subnet.blockSize) continue;

        // Calcular inicio alineado (múltiplo del tamaño de bloque)
        const alignedStart = Math.ceil(start / subnet.blockSize) * subnet.blockSize;

        // Verificar si cabe en el rango actual
        if (alignedStart >= start && (alignedStart + subnet.blockSize - 1) <= end) {
          // Asignar subred
          subnet.base = alignedStart;
          subnet.broadcast = alignedStart + subnet.blockSize - 1;
          subnet.mask = 32 - Math.log2(subnet.blockSize);

          // Actualizar rangos libres
          freeRanges.splice(i, 1);  // Eliminar rango actual

          // Agregar nuevo rango izquierdo si hay espacio
          if (alignedStart > start) {
            freeRanges.push([start, alignedStart - 1]);
          }

          // Agregar nuevo rango derecho si hay espacio
          if (subnet.broadcast < end) {
            freeRanges.push([subnet.broadcast + 1, end]);
          }

          assigned = true;
          break;
        }
      }

      if (!assigned) {
        output.textContent = `Error: No hay espacio para la subred ${subnet.originalIndex+1} (requiere ${subnet.hosts} hosts).`;
        error = true;
        break;
      }
    }

    if (error) return;

    // Ordenar subredes por índice original para mostrar
    subnets.sort((a, b) => a.originalIndex - b.originalIndex);

    result += `\n--- Cálculo con hosts personalizados (VLSM) ---\n`;
    for (let subnet of subnets) {
      const startHost = subnet.base + 1;
      const endHost = subnet.broadcast - 1;
      const hostsDisponibles = subnet.blockSize - 2;

      result += `Subred ${subnet.originalIndex + 1} (${subnet.hosts} hosts, máscara /${subnet.mask}):\n`;
      result += `  Dirección de red: ${intToIp(subnet.base)}\n`;
      result += `  Broadcast: ${intToIp(subnet.broadcast)}\n`;
      result += `  Rango de hosts: ${intToIp(startHost)} - ${intToIp(endHost)}\n`;
      result += `  Hosts disponibles: ${hostsDisponibles}\n\n`;
    }

    output.textContent = result;
    return;
  }

  // Caso 1: ambos automáticos => cálculo eficiente maximizando subredes y hosts
  if (modoSubnets === "auto" && modoHosts === "auto") {
    const totalBits = 32 - mask;
    let mejorBitsSubnets = 0;
    let mejorBitsHosts = 0;

    // Priorizar la máxima cantidad de subredes
    for (let bitsSubnets = totalBits - 1; bitsSubnets >= 1; bitsSubnets--) {
      let bitsHosts = totalBits - bitsSubnets;
      let hostsPorSubnet = (2 ** bitsHosts) - 2;
      if (hostsPorSubnet < 0) continue;

      // Verificar que la máscara final no exceda /30
      let nuevaMask = mask + bitsSubnets;
      if (nuevaMask > 30) continue;

      // Tomamos la primera combinación que cumpla
      mejorBitsSubnets = bitsSubnets;
      mejorBitsHosts = bitsHosts;
      break;
    }

    if (mejorBitsSubnets === 0) {
      output.textContent = "No es posible calcular subredes y hosts con los parámetros dados.";
      return;
    }

    const nuevaMask = mask + mejorBitsSubnets;
    const blockSize = 2 ** mejorBitsHosts;
    const numSubnets = 2 ** mejorBitsSubnets;
    const hostsPerSubnet = blockSize - 2;

    result += `\n--- Cálculo eficiente priorizando máximo número de subredes ---\n`;
    result += `Máscara usada: /${nuevaMask} (${intToIp(maskToInt(nuevaMask))})\n`;
    result += `Número de subredes: ${numSubnets}\n`;
    result += `Hosts por subred: ${hostsPerSubnet}\n\n`;
    result += `Subredes:\n`;

    for (let i = 0; i < numSubnets; i++) {
      const subnetBase = networkInt + i * blockSize;
      const subnetBroadcast = subnetBase + blockSize - 1;
      const subnetStart = subnetBase + 1;
      const subnetEnd = subnetBroadcast - 1;

      result += `Subred ${i + 1}:\n`;
      result += `  Dirección de red: ${intToIp(subnetBase)}\n`;
      result += `  Broadcast: ${intToIp(subnetBroadcast)}\n`;
      result += `  Rango de hosts: ${intToIp(subnetStart)} - ${intToIp(subnetEnd)}\n\n`;
    }

    output.textContent = result;
    return;
  }

  // Caso 2: modo subredes manual, hosts automático
  if (modoSubnets === "manual" && modoHosts === "auto") {
    const subnetCount = parseInt(document.getElementById("subnetCount").value);
    if (!subnetCount || subnetCount < 1) {
      output.textContent = "Error: Ingresa un número válido de subredes.";
      return;
    }

    const bitsParaSubredes = Math.ceil(Math.log2(subnetCount));
    const nuevaMask = mask + bitsParaSubredes;
    if (nuevaMask > 30) {
      output.textContent = "No es posible crear tantas subredes con esa red base.";
      return;
    }

    const blockSize = 2 ** (32 - nuevaMask);
    const numSubnets = 2 ** (nuevaMask - mask);
    const hostsPerSubnet = blockSize - 2;

    result += `\n--- Cálculo manual subredes ---\n`;
    result += `Máscara usada: /${nuevaMask} (${intToIp(maskToInt(nuevaMask))})\n`;
    result += `Número de subredes creadas: ${numSubnets}\n`;
    result += `Hosts por subred (automático): ${hostsPerSubnet}\n`;
    result += `Subredes utilizadas (${subnetCount} de ${numSubnets}):\n\n`;

    for (let i = 0; i < subnetCount; i++) {
      const subnetBase = networkInt + i * blockSize;
      const subnetBroadcast = subnetBase + blockSize - 1;
      const subnetStart = subnetBase + 1;
      const subnetEnd = subnetBroadcast - 1;

      result += `Subred ${i + 1}:\n`;
      result += `  Dirección de red: ${intToIp(subnetBase)}\n`;
      result += `  Broadcast: ${intToIp(subnetBroadcast)}\n`;
      result += `  Rango de hosts: ${intToIp(subnetStart)} - ${intToIp(subnetEnd)}\n\n`;
    }

    // Mostrar subredes no utilizadas si las hay
    if (numSubnets > subnetCount) {
      result += `Subredes adicionales disponibles: ${numSubnets - subnetCount}\n`;
    }

    output.textContent = result;
    return;
  }

  // Caso 3: modo subredes automático, hosts manual
  if (modoSubnets === "auto" && modoHosts === "manual") {
    const hostCount = parseInt(document.getElementById("hostCount").value);
    if (!hostCount || hostCount < 1) {
      output.textContent = "Error: Ingresa un número válido de hosts por subred.";
      return;
    }

    const bitsParaHosts = Math.ceil(Math.log2(hostCount + 2));
    const nuevaMask = 32 - bitsParaHosts;

    if (nuevaMask < mask) {
      output.textContent = "No es posible crear subredes con ese número de hosts y red base.";
      return;
    }

    const blockSize = 2 ** (32 - nuevaMask);
    const numSubnets = 2 ** (nuevaMask - mask);
    const hostsPerSubnet = blockSize - 2;

    result += `\n--- Cálculo manual hosts ---\n`;
    result += `Máscara usada: /${nuevaMask} (${intToIp(maskToInt(nuevaMask))})\n`;
    result += `Número de subredes (automático): ${numSubnets}\nHosts por subred: ${hostsPerSubnet}\n\n`;
    result += `Subredes:\n`;

    for (let i = 0; i < numSubnets; i++) {
      const subnetBase = networkInt + i * blockSize;
      const subnetBroadcast = subnetBase + blockSize - 1;
      const subnetStart = subnetBase + 1;
      const subnetEnd = subnetBroadcast - 1;

      result += `Subred ${i + 1}:\n`;
      result += `  Dirección de red: ${intToIp(subnetBase)}\n`;
      result += `  Broadcast: ${intToIp(subnetBroadcast)}\n`;
      result += `  Rango de hosts: ${intToIp(subnetStart)} - ${intToIp(subnetEnd)}\n\n`;
    }

    output.textContent = result;
    return;
  }

  // Caso 4: ambos manuales (MODO MANUAL CON HOSTS FIJOS - CORREGIDO)
  if (modoSubnets === "manual" && modoHosts === "manual") {
    const subnetCount = parseInt(document.getElementById("subnetCount").value);
    const hostCount = parseInt(document.getElementById("hostCount").value);

    if (!subnetCount || subnetCount < 1) {
      output.textContent = "Error: Ingresa un número válido de subredes.";
      return;
    }
    if (!hostCount || hostCount < 1) {
      output.textContent = "Error: Ingresa un número válido de hosts por subred.";
      return;
    }

    // Calcular bits necesarios para hosts
    const bitsHosts = Math.ceil(Math.log2(hostCount + 2));
    const bitsSubredes = Math.ceil(Math.log2(subnetCount));
    const totalBitsNeeded = bitsHosts + bitsSubredes;
    const bitsDisponibles = 32 - mask;

    // Verificar si hay suficientes bits disponibles
    if (totalBitsNeeded > bitsDisponibles) {
      output.textContent = "Error: Bits insuficientes para crear las subredes con los hosts solicitados.";
      return;
    }

    // Calcular nueva máscara y tamaño de bloque
    const nuevaMask = 32 - bitsHosts;
    const blockSize = 2 ** bitsHosts;
    const hostsPerSubnet = blockSize - 2;
    const numSubnets = 2 ** bitsSubredes;

    // Verificar que la nueva máscara sea válida
    if (nuevaMask < mask || nuevaMask > 30) {
      output.textContent = "Error: Máscara resultante inválida.";
      return;
    }

    // Calcular desperdicio
    const desperdicio = (numSubnets - subnetCount) * blockSize;

    result += `\n--- Cálculo manual completo (CORREGIDO) ---\n`;
    result += `Máscara usada: /${nuevaMask} (${intToIp(maskToInt(nuevaMask))})\n`;
    result += `Tamaño de bloque: ${blockSize} direcciones (${bitsHosts} bits para hosts)\n`;
    result += `Hosts por subred: ${hostsPerSubnet} (solicitados: ${hostCount})\n`;
    result += `Bits para subredes: ${bitsSubredes}\n`;
    result += `Subredes totales posibles: ${numSubnets}\n`;
    result += `Subredes utilizadas: ${subnetCount}\n`;

    if (numSubnets > subnetCount) {
      result += `Subredes disponibles: ${numSubnets - subnetCount}\n`;
      result += `Direcciones reservadas: ${desperdicio}\n`;
    }

    result += `\nSubredes utilizadas:\n`;

    for (let i = 0; i < subnetCount; i++) {
      const subnetBase = networkInt + i * blockSize;
      const subnetBroadcast = subnetBase + blockSize - 1;
      const subnetStart = subnetBase + 1;
      const subnetEnd = subnetBroadcast - 1;

      result += `Subred ${i + 1}:\n`;
      result += `  Dirección de red: ${intToIp(subnetBase)}\n`;
      result += `  Broadcast: ${intToIp(subnetBroadcast)}\n`;
      result += `  Rango de hosts: ${intToIp(subnetStart)} - ${intToIp(subnetEnd)}\n`;
      result += `  Hosts disponibles: ${hostsPerSubnet}\n\n`;
    }

    output.textContent = result;
    return;
  }

  output.textContent = "Error: Configuración de modos no soportada.";
}

// Convierte IP en string a entero 32-bit sin signo
function ipToInt(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Convierte entero 32-bit sin signo a IP en string
function intToIp(int) {
  return [24, 16, 8, 0].map(shift => (int >>> shift) & 255).join(".");
}

// Convierte máscara en bits a entero 32-bit sin signo
function maskToInt(mask) {
  return mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
}

// Valida formato básico de IP
function validarIp(ip) {
  const octets = ip.trim().split(".");
  if (octets.length !== 4) return false;
  return octets.every(o => {
    const n = parseInt(o);
    return !isNaN(n) && n >= 0 && n <= 255;
  });
}