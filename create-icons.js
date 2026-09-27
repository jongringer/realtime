const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// icons 디렉토리 생성
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. 고화질 SVG 아이콘 생성
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- 배경 둥근 사각형 (스마트폰 앱 아이콘 스타일) -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />

  <!-- 캘린더 메인 카드 -->
  <g filter="url(#shadow)">
    <rect x="86" y="96" width="340" height="320" rx="36" fill="url(#calGrad)" />
    
    <!-- 캘린더 상단 헤더 바 (레드) -->
    <path d="M 86 132 C 86 112 102 96 122 96 L 390 96 C 410 96 426 112 426 132 L 426 168 L 86 168 Z" fill="#ef4444" />
    
    <!-- 캘린더 바인더 링 -->
    <rect x="156" y="76" width="28" height="42" rx="14" fill="#334155" />
    <rect x="328" y="76" width="28" height="42" rx="14" fill="#334155" />

    <!-- 4교대 뱃지 그리드 -->
    <!-- 일근 (파랑) -->
    <rect x="116" y="196" width="125" height="85" rx="16" fill="#1d4ed8" />
    <text x="178" y="250" font-family="-apple-system, BlinkMacSystemFont, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">일근</text>

    <!-- 야근 (주황) -->
    <rect x="271" y="196" width="125" height="85" rx="16" fill="#b45309" />
    <text x="333" y="250" font-family="-apple-system, BlinkMacSystemFont, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">야근</text>

    <!-- 조근 (보라) -->
    <rect x="116" y="306" width="125" height="85" rx="16" fill="#6d28d9" />
    <text x="178" y="360" font-family="-apple-system, BlinkMacSystemFont, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">조근</text>

    <!-- 대근/휴가 (초록/빨강 포인트) -->
    <rect x="271" y="306" width="125" height="85" rx="16" fill="#059669" />
    <text x="333" y="360" font-family="-apple-system, BlinkMacSystemFont, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">대근</text>
  </g>

  <!-- 하단 4교대 엠블럼 -->
  <circle cx="410" cy="410" r="54" fill="#0284c7" stroke="#ffffff" stroke-width="6" />
  <text x="410" y="424" font-family="-apple-system, BlinkMacSystemFont, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">4조</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);

// 순수 Node.js로 유효한 PNG 생성 헬퍼 (무손실 압축 PNG 생성)
function createValidPNG(width, height, r, g, b) {
  // PNG 시그니처
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR 청크
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression method
  ihdrData.writeUInt8(0, 11); // filter method
  ihdrData.writeUInt8(0, 12); // interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT 청크 (이미지 데이터)
  // 라인당 필터 바이트(0) + RGB 3바이트
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // 중앙에 파란색/하늘색 그라데이션 및 캘린더 느낌
      const distFromCenter = Math.sqrt(Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2));
      if (distFromCenter < width * 0.42) {
        rawData[pxOffset] = 2;     // R
        rawData[pxOffset + 1] = 132; // G
        rawData[pxOffset + 2] = 199; // B (Primary Blue)
      } else {
        rawData[pxOffset] = 15;    // R
        rawData[pxOffset + 1] = 23;  // G
        rawData[pxOffset + 2] = 42;  // B (Dark Slate)
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND 청크
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(12 + length);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4);
  data.copy(buffer, 8);

  const crc = crc32(buffer.slice(4, 8 + length));
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// CRC32 테이블 및 계산
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 192x192 및 512x512 아이콘 생성
const png192 = createValidPNG(192, 192, 2, 132, 199);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

const png512 = createValidPNG(512, 512, 2, 132, 199);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

// apple-touch-icon
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), png192);

console.log('✅ 고화질 앱 아이콘 (icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png) 생성 완료!');
