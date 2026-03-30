const VERSION_CONFIGS = [
  { version: 1, alignment: [], dataBlocks: [19], eccCount: 7 },
  { version: 2, alignment: [6, 18], dataBlocks: [34], eccCount: 10 },
  { version: 3, alignment: [6, 22], dataBlocks: [55], eccCount: 15 },
  { version: 4, alignment: [6, 26], dataBlocks: [80], eccCount: 20 },
  { version: 5, alignment: [6, 30], dataBlocks: [108], eccCount: 26 },
  { version: 6, alignment: [6, 34], dataBlocks: [68, 68], eccCount: 18 },
  { version: 7, alignment: [6, 22, 38], dataBlocks: [78, 78], eccCount: 20 },
  { version: 8, alignment: [6, 24, 42], dataBlocks: [97, 97], eccCount: 24 },
  { version: 9, alignment: [6, 26, 46], dataBlocks: [116, 116], eccCount: 30 },
  { version: 10, alignment: [6, 28, 50], dataBlocks: [68, 68, 69, 69], eccCount: 18 },
];

const ERROR_CORRECTION_LEVEL_L = 1;
const MODE_BYTE = 0b0100;
const G15 = 1335;
const G18 = 7973;
const G15_MASK = 21522;

const EXP_TABLE = new Array(512);
const LOG_TABLE = new Array(256);

for (let index = 0; index < 8; index += 1) {
  EXP_TABLE[index] = 1 << index;
}

for (let index = 8; index < 256; index += 1) {
  EXP_TABLE[index] = EXP_TABLE[index - 4] ^ EXP_TABLE[index - 5] ^ EXP_TABLE[index - 6] ^ EXP_TABLE[index - 8];
}

for (let index = 0; index < 255; index += 1) {
  EXP_TABLE[index + 255] = EXP_TABLE[index];
  LOG_TABLE[EXP_TABLE[index]] = index;
}

function encodeText(text: string) {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(text));
  }

  return Array.from(text, (char) => char.charCodeAt(0) & 0xff);
}

function getVersionConfig(byteLength) {
  return VERSION_CONFIGS.find((config) => {
    const lengthBits = config.version < 10 ? 8 : 16;
    const requiredBits = 4 + lengthBits + byteLength * 8;
    const capacityBits = config.dataBlocks.reduce((sum, value) => sum + value, 0) * 8;
    return requiredBits <= capacityBits;
  });
}

function createBitBuffer() {
  const bits = [];

  return {
    bits,
    get length() {
      return bits.length;
    },
    put(value, length) {
      for (let index = length - 1; index >= 0; index -= 1) {
        bits.push(((value >>> index) & 1) === 1 ? 1 : 0);
      }
    },
    putByte(value) {
      this.put(value, 8);
    },
    toBytes() {
      const bytes = [];
      for (let index = 0; index < bits.length; index += 8) {
        let value = 0;
        for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
          value = (value << 1) | (bits[index + bitIndex] ?? 0);
        }
        bytes.push(value);
      }
      return bytes;
    },
  };
}

function buildDataBytes(text, config) {
  const bytes = encodeText(text);
  const buffer = createBitBuffer();
  const dataCapacity = config.dataBlocks.reduce((sum, value) => sum + value, 0);
  const lengthBits = config.version < 10 ? 8 : 16;

  buffer.put(MODE_BYTE, 4);
  buffer.put(bytes.length, lengthBits);
  bytes.forEach((value) => buffer.putByte(value));

  const capacityBits = dataCapacity * 8;
  const remainingBits = capacityBits - buffer.length;
  buffer.put(0, Math.min(4, remainingBits));

  while (buffer.length % 8 !== 0) {
    buffer.put(0, 1);
  }

  const dataBytes = buffer.toBytes();
  const pads = [0xec, 0x11];
  let padIndex = 0;

  while (dataBytes.length < dataCapacity) {
    dataBytes.push(pads[padIndex % pads.length]);
    padIndex += 1;
  }

  return dataBytes;
}

function multiplyGalois(left, right) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return EXP_TABLE[LOG_TABLE[left] + LOG_TABLE[right]];
}

function multiplyPolynomial(left, right) {
  const result = new Array(left.length + right.length - 1).fill(0);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] ^= multiplyGalois(left[leftIndex], right[rightIndex]);
    }
  }

  return result;
}

function createGeneratorPolynomial(degree) {
  let polynomial = [1];

  for (let index = 0; index < degree; index += 1) {
    polynomial = multiplyPolynomial(polynomial, [1, EXP_TABLE[index]]);
  }

  return polynomial;
}

function createErrorCorrection(dataBytes, eccCount) {
  const generator = createGeneratorPolynomial(eccCount);
  const message = dataBytes.concat(new Array(eccCount).fill(0));

  for (let index = 0; index < dataBytes.length; index += 1) {
    const factor = message[index];
    if (factor === 0) {
      continue;
    }

    for (let generatorIndex = 0; generatorIndex < generator.length; generatorIndex += 1) {
      message[index + generatorIndex] ^= multiplyGalois(generator[generatorIndex], factor);
    }
  }

  return message.slice(dataBytes.length);
}

function createCodewords(text, config) {
  const dataBytes = buildDataBytes(text, config);
  const blocks = [];
  let offset = 0;

  config.dataBlocks.forEach((blockSize) => {
    const blockData = dataBytes.slice(offset, offset + blockSize);
    offset += blockSize;
    blocks.push({
      data: blockData,
      ecc: createErrorCorrection(blockData, config.eccCount),
    });
  });

  const codewords = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));

  for (let index = 0; index < maxDataLength; index += 1) {
    blocks.forEach((block) => {
      if (index < block.data.length) {
        codewords.push(block.data[index]);
      }
    });
  }

  for (let index = 0; index < config.eccCount; index += 1) {
    blocks.forEach((block) => {
      codewords.push(block.ecc[index]);
    });
  }

  return codewords;
}

function createMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function createReserved(size) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function setModule(modules, reserved, row, col, value) {
  if (row < 0 || col < 0 || row >= modules.length || col >= modules.length) {
    return;
  }

  modules[row][col] = value;
  reserved[row][col] = true;
}

function setupFinder(modules, reserved, row, col) {
  for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 7; colOffset += 1) {
      const currentRow = row + rowOffset;
      const currentCol = col + colOffset;
      const isOuter = rowOffset === -1 || rowOffset === 7 || colOffset === -1 || colOffset === 7;
      const isBorder = rowOffset === 0 || rowOffset === 6 || colOffset === 0 || colOffset === 6;
      const isCenter = rowOffset >= 2 && rowOffset <= 4 && colOffset >= 2 && colOffset <= 4;
      setModule(modules, reserved, currentRow, currentCol, !isOuter && (isBorder || isCenter));
    }
  }
}

function setupAlignment(modules, reserved, row, col) {
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
      const distance = Math.max(Math.abs(rowOffset), Math.abs(colOffset));
      setModule(modules, reserved, row + rowOffset, col + colOffset, distance !== 1);
    }
  }
}

function setupTiming(modules, reserved) {
  const size = modules.length;

  for (let index = 8; index < size - 8; index += 1) {
    if (!reserved[6][index]) {
      setModule(modules, reserved, 6, index, index % 2 === 0);
    }

    if (!reserved[index][6]) {
      setModule(modules, reserved, index, 6, index % 2 === 0);
    }
  }
}

function reserveFormatAreas(modules, reserved, version) {
  const size = modules.length;

  for (let index = 0; index < 15; index += 1) {
    const verticalRow = index < 6 ? index : index < 8 ? index + 1 : size - 15 + index;
    const horizontalCol = index < 8 ? size - index - 1 : index < 9 ? 7 : 15 - index - 1;
    setModule(modules, reserved, verticalRow, 8, false);
    setModule(modules, reserved, 8, horizontalCol, false);
  }

  setModule(modules, reserved, size - 8, 8, true);

  if (version < 7) {
    return;
  }

  for (let index = 0; index < 18; index += 1) {
    const rowA = Math.floor(index / 3);
    const colA = (index % 3) + size - 11;
    const rowB = (index % 3) + size - 11;
    const colB = Math.floor(index / 3);
    setModule(modules, reserved, rowA, colA, false);
    setModule(modules, reserved, rowB, colB, false);
  }
}

function buildBaseMatrix(config) {
  const size = config.version * 4 + 17;
  const modules = createMatrix(size);
  const reserved = createReserved(size);

  setupFinder(modules, reserved, 0, 0);
  setupFinder(modules, reserved, size - 7, 0);
  setupFinder(modules, reserved, 0, size - 7);
  setupTiming(modules, reserved);

  if (config.alignment.length > 0) {
    config.alignment.forEach((row) => {
      config.alignment.forEach((col) => {
        if (reserved[row][col]) {
          return;
        }

        setupAlignment(modules, reserved, row, col);
      });
    });
  }

  reserveFormatAreas(modules, reserved, config.version);
  return { modules, reserved };
}

function getBchDigit(data) {
  let digit = 0;
  let working = data;

  while (working !== 0) {
    digit += 1;
    working >>>= 1;
  }

  return digit;
}

function getBchTypeInfo(data) {
  let working = data << 10;

  while (getBchDigit(working) - getBchDigit(G15) >= 0) {
    working ^= G15 << (getBchDigit(working) - getBchDigit(G15));
  }

  return ((data << 10) | working) ^ G15_MASK;
}

function getBchTypeNumber(data) {
  let working = data << 12;

  while (getBchDigit(working) - getBchDigit(G18) >= 0) {
    working ^= G18 << (getBchDigit(working) - getBchDigit(G18));
  }

  return (data << 12) | working;
}

function getMask(maskPattern, row, col) {
  switch (maskPattern) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function mapData(modules, reserved, codewords, maskPattern) {
  const size = modules.length;
  let row = size - 1;
  let direction = -1;
  let byteIndex = 0;
  let bitIndex = 7;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) {
      col -= 1;
    }

    while (true) {
      for (let colOffset = 0; colOffset < 2; colOffset += 1) {
        const currentCol = col - colOffset;
        if (reserved[row][currentCol]) {
          continue;
        }

        let dark = false;
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        }

        if (getMask(maskPattern, row, currentCol)) {
          dark = !dark;
        }

        modules[row][currentCol] = dark;
        bitIndex -= 1;

        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }

      row += direction;
      if (row < 0 || row >= size) {
        row -= direction;
        direction *= -1;
        break;
      }
    }
  }
}

function setupTypeInfo(modules, maskPattern) {
  const size = modules.length;
  const bits = getBchTypeInfo((ERROR_CORRECTION_LEVEL_L << 3) | maskPattern);

  for (let index = 0; index < 15; index += 1) {
    const dark = ((bits >>> index) & 1) === 1;
    const verticalRow = index < 6 ? index : index < 8 ? index + 1 : size - 15 + index;
    const horizontalCol = index < 8 ? size - index - 1 : index < 9 ? 7 : 15 - index - 1;
    modules[verticalRow][8] = dark;
    modules[8][horizontalCol] = dark;
  }

  modules[size - 8][8] = true;
}

function setupTypeNumber(modules, version) {
  if (version < 7) {
    return;
  }

  const bits = getBchTypeNumber(version);
  const size = modules.length;

  for (let index = 0; index < 18; index += 1) {
    const dark = ((bits >>> index) & 1) === 1;
    const rowA = Math.floor(index / 3);
    const colA = (index % 3) + size - 11;
    const rowB = (index % 3) + size - 11;
    const colB = Math.floor(index / 3);
    modules[rowA][colA] = dark;
    modules[rowB][colB] = dark;
  }
}

function applyPenaltyRule1(modules) {
  let penalty = 0;
  const size = modules.length;

  for (let row = 0; row < size; row += 1) {
    let sameCount = 1;
    let previous = modules[row][0];

    for (let col = 1; col < size; col += 1) {
      const value = modules[row][col];
      if (value === previous) {
        sameCount += 1;
        continue;
      }

      if (sameCount >= 5) {
        penalty += 3 + (sameCount - 5);
      }

      sameCount = 1;
      previous = value;
    }

    if (sameCount >= 5) {
      penalty += 3 + (sameCount - 5);
    }
  }

  for (let col = 0; col < size; col += 1) {
    let sameCount = 1;
    let previous = modules[0][col];

    for (let row = 1; row < size; row += 1) {
      const value = modules[row][col];
      if (value === previous) {
        sameCount += 1;
        continue;
      }

      if (sameCount >= 5) {
        penalty += 3 + (sameCount - 5);
      }

      sameCount = 1;
      previous = value;
    }

    if (sameCount >= 5) {
      penalty += 3 + (sameCount - 5);
    }
  }

  return penalty;
}

function applyPenaltyRule2(modules) {
  let penalty = 0;
  const size = modules.length;

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const value = modules[row][col];
      if (
        value === modules[row][col + 1]
        && value === modules[row + 1][col]
        && value === modules[row + 1][col + 1]
      ) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

function matchesFinderPenaltyPattern(values, start) {
  const patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

  for (let index = 0; index < 11; index += 1) {
    const value = values[start + index] ? 1 : 0;
    if (value !== patternA[index] && value !== patternB[index]) {
      return false;
    }
  }

  return true;
}

function applyPenaltyRule3(modules) {
  let penalty = 0;
  const size = modules.length;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col <= size - 11; col += 1) {
      if (matchesFinderPenaltyPattern(modules[row], col)) {
        penalty += 40;
      }
    }
  }

  for (let col = 0; col < size; col += 1) {
    const values = [];
    for (let row = 0; row < size; row += 1) {
      values.push(modules[row][col]);
    }

    for (let row = 0; row <= size - 11; row += 1) {
      if (matchesFinderPenaltyPattern(values, row)) {
        penalty += 40;
      }
    }
  }

  return penalty;
}

function applyPenaltyRule4(modules) {
  const size = modules.length;
  const totalCount = size * size;
  let darkCount = 0;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (modules[row][col]) {
        darkCount += 1;
      }
    }
  }

  const ratio = (darkCount * 100) / totalCount;
  return Math.floor(Math.abs(ratio - 50) / 5) * 10;
}

function getPenaltyScore(modules) {
  return (
    applyPenaltyRule1(modules)
    + applyPenaltyRule2(modules)
    + applyPenaltyRule3(modules)
    + applyPenaltyRule4(modules)
  );
}

function cloneMatrix(modules) {
  return modules.map((row) => row.slice());
}

function createQrModules(text) {
  const config = getVersionConfig(encodeText(text).length);

  if (!config) {
    throw new Error("当前分享链接太长，二维码暂时生成失败。请改用复制链接分享。");
  }

  const { modules: baseModules, reserved } = buildBaseMatrix(config);
  const codewords = createCodewords(text, config);
  let bestModules = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
    const modules = cloneMatrix(baseModules);
    mapData(modules, reserved, codewords, maskPattern);
    setupTypeInfo(modules, maskPattern);
    setupTypeNumber(modules, config.version);
    const penalty = getPenaltyScore(modules);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestModules = modules;
    }
  }

  return bestModules;
}

function createSvgMarkup(modules, { margin = 2, darkColor = "#061018", lightColor = "#ffffff" } = {}) {
  const size = modules.length + margin * 2;
  const paths = [];

  for (let row = 0; row < modules.length; row += 1) {
    for (let col = 0; col < modules.length; col += 1) {
      if (!modules[row][col]) {
        continue;
      }

      const x = col + margin;
      const y = row + margin;
      paths.push(`M${x} ${y}h1v1h-1z`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${lightColor}"/><path d="${paths.join("")}" fill="${darkColor}"/></svg>`;
}

export function createQrCodeDataUrl(text, options = {}) {
  if (!text) {
    return "";
  }

  const modules = createQrModules(text);
  const svg = createSvgMarkup(modules, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
