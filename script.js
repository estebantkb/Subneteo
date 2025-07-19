// Actualiza habilitación de inputs según selección manual/auto para subredes y hosts
function actualizarModos() {
  const modoSubnets = document.getElementById("modoSubnets").value;
  const modoHosts = document.getElementById("modoHosts").value;

  const subnetField = document.getElementById("subnetCount");
  const hostField = document.getElementById("hostCount");

  // Deshabilitar si modo es automático
  subnetField.disabled = (modoSubnets === "auto");
  hostField.disabled = (modoHosts === "auto");

  subnetField.classList.toggle("disabled", subnetField.disabled);
  hostField.classList.toggle("disabled", hostField.disabled);

  // Limpiar inputs deshabilitados
  if (subnetField.disabled) subnetField.value = "";
  if (hostField.disabled) hostField.value = "";

  actualizarMaximos();
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
  const maxHosts = 2 ** totalBits - 2;

  if (modoSubnets === "manual") {
    maxSubnetsInfo.textContent = `Máx: ${maxSubnets}`;
  } else {
    maxSubnetsInfo.textContent = "Modo automático";
  }

  if (modoHosts === "manual") {
    maxHostsInfo.textContent = `Máx: ${maxHosts}`;
  } else {
    maxHostsInfo.textContent = "Modo automático";
  }

  // Si modo subnets manual y valor ingresado, calcular máximo hosts posible
  if (modoSubnets === "manual") {
    const subnetCount = parseInt(document.getElementById("subnetCount").value) || 0;
    if (subnetCount > 0) {
      const bitsParaSubredes = Math.ceil(Math.log2(subnetCount));
      const nuevaMascara = mask + bitsParaSubredes;
      if (nuevaMascara <= 30) {
        const hostsMaxPorSubnet = 2 ** (32 - nuevaMascara) - 2;
        maxHostsInfo.textContent = `Máx: ${hostsMaxPorSubnet} (por subred con ${subnetCount} subredes)`;
      } else {
        maxHostsInfo.textContent = "No es posible";
      }
    }
  }
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

  // Caso 1: ambos automáticos => cálculo eficiente maximizando subredes y hosts
  if (modoSubnets === "auto" && modoHosts === "auto") {
    const totalBits = 32 - mask;
    let mejorBitsSubnets = 0;
    let mejorBitsHosts = 0;

    // Priorizar la máxima cantidad de subredes: bitsSubnets crece desde totalBits-1 hacia 1
    for (let bitsSubnets = totalBits - 1; bitsSubnets >= 1; bitsSubnets--) {
      let bitsHosts = totalBits - bitsSubnets;
      let hostsPorSubnet = (2 ** bitsHosts) - 2;
      if (hostsPorSubnet < 0) continue;

      // Verificar que la máscara final no exceda /30
      let nuevaMask = mask + bitsSubnets;
      if (nuevaMask > 30) continue;

      // Tomamos la primera combinación que cumpla (más subredes posibles)
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

    let result = `Red original: ${ipStr}/${mask} (${intToIp(maskInt)})\n`;
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
    result += `Número de subredes: ${numSubnets}\nHosts por subred (automático): ${hostsPerSubnet}\n\n`;
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

  // Caso 4: ambos manuales
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

    const bitsParaSubredes = Math.ceil(Math.log2(subnetCount));
    const bitsParaHosts = Math.ceil(Math.log2(hostCount + 2));
    const nuevaMaskSubnets = mask + bitsParaSubredes;
    const nuevaMaskHosts = 32 - bitsParaHosts;

    if (nuevaMaskSubnets > 30) {
      output.textContent = "No es posible crear tantas subredes con esa red base.";
      return;
    }
    if (nuevaMaskHosts < mask) {
      output.textContent = "No es posible asignar tantos hosts con esa red base.";
      return;
    }

    const nuevaMask = Math.max(nuevaMaskSubnets, nuevaMaskHosts);

    const blockSize = 2 ** (32 - nuevaMask);
    const numSubnets = 2 ** (nuevaMask - mask);
    const hostsPerSubnet = blockSize - 2;

    if (hostsPerSubnet < hostCount) {
      output.textContent = "No es posible crear subredes con los hosts por subred indicados.";
      return;
    }

    result += `\n--- Cálculo manual completo ---\n`;
    result += `Máscara usada: /${nuevaMask} (${intToIp(maskToInt(nuevaMask))})\n`;
    result += `Número de subredes: ${numSubnets}\nHosts por subred: ${hostsPerSubnet}\n\n`;
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

