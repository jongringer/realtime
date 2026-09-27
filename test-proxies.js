const subwayKey = '476a79484b6a6f6e3833504f4f6d4e';
const busKey = '0f40f3c7a3220ef7d0f45825f4364e47d05d10fa087632a03db7c8c2222aae63';

const subwayUrl = `http://swopenAPI.seoul.go.kr/api/subway/${subwayKey}/json/realtimeStationArrival/0/10/${encodeURIComponent('국회의사당')}`;
const busUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${encodeURIComponent(busKey)}&arsId=15154&resultType=json`;

async function testFetch(name, url) {
  try {
    const start = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
    const text = await res.text();
    const duration = Date.now() - start;
    const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    console.log(`[${name}] ${res.status} in ${duration}ms (isJson: ${isJson}, len: ${text.length})`);
    if (isJson) {
      const parsed = JSON.parse(text);
      return true;
    }
  } catch (err) {
    console.log(`[${name}] Failed: ${err.message}`);
  }
  return false;
}

async function run() {
  console.log('--- Testing Subway Proxies ---');
  await testFetch('Subway Direct', subwayUrl);
  await testFetch('Subway codetabs', `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(subwayUrl)}`);
  await testFetch('Subway corsproxy.io', `https://corsproxy.io/?${encodeURIComponent(subwayUrl)}`);
  await testFetch('Subway allorigins', `https://api.allorigins.win/raw?url=${encodeURIComponent(subwayUrl)}`);

  console.log('\n--- Testing Bus Proxies ---');
  await testFetch('Bus Direct', busUrl);
  await testFetch('Bus codetabs', `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(busUrl)}`);
  await testFetch('Bus corsproxy.io', `https://corsproxy.io/?${encodeURIComponent(busUrl)}`);
  await testFetch('Bus allorigins', `https://api.allorigins.win/raw?url=${encodeURIComponent(busUrl)}`);
}

run();
