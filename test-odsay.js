const https = require('https');

const apiKey = 'd2hM82mSFbFtvCVF6BsaJA';
const referer = 'https://kbs-4shift-5855.surge.sh';

function getSubway(stationID) {
  return new Promise(resolve => {
    const url = `https://api.odsay.com/v1/api/searchSubwaySchedule?stationID=${stationID}&apiKey=${encodeURIComponent(apiKey)}`;
    https.get(url, { headers: { 'Referer': referer, 'Origin': referer } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
  });
}

async function test() {
  const data = await getSubway(914); // 국회의사당역
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const nowMinTotal = nowH * 60 + nowM;

  console.log(`Current time: ${nowH}:${nowM} (${nowMinTotal} mins)`);

  const sched = data.result.weekdaySchedule.down; // 하행 (당산/개화 방면)
  console.log('Total down trains:', sched.length);

  // Filter general trains only (subwayClass === 0)
  const normalTrains = sched.filter(t => t.subwayClass === 0);
  console.log('Normal down trains:', normalTrains.length);

  // Find trains departing after now
  const upcoming = normalTrains.filter(t => {
    const [h, m] = t.departureTime.split(':').map(Number);
    const minTotal = h * 60 + m;
    return minTotal >= nowMinTotal;
  });

  console.log('Upcoming normal trains:', upcoming.slice(0, 3));
}

test();
