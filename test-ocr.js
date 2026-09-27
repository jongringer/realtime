// OCR 텍스트 파서 테스트
const fs = require('fs');

// ocr-parser.js 파일 읽어서 검증
const ocrCode = fs.readFileSync('./js/ocr-parser.js', 'utf-8');
// 클래스 추출을 위한 간이 러너
const sandbox = {
  console,
  pdfjsLib: {},
  Tesseract: {}
};
const script = new Function('sandbox', `
  with(sandbox) {
    ${ocrCode}
    return shiftOCRParser;
  }
`);
const parser = script(sandbox);

const sampleOcrText = `
[9월 근무 변경 안내]
9월 17일: 일근대근 (09:00 ~ 18:00) 대근 지원
9월 18일: 일근휴가 (연차 사용)
9/19(토): 야근
`;

const parsed = parser.parseShiftText(sampleOcrText, 2026, 9);
console.log('추출 결과:', parsed);

if (parsed.length === 3 &&
    parsed[0].shiftType === '일근대근' &&
    parsed[1].shiftType === '일근휴가' &&
    parsed[2].shiftType === '야근') {
  console.log('✅ OCR 파서 테스트 성공: 날짜별 대근/휴가/교대근무 패턴이 정확히 추출되었습니다!');
} else {
  console.error('❌ OCR 파서 테스트 실패');
  process.exit(1);
}
