export const TAX_PER_PASSENGER = 70;

export const JD5162_SERVICES = {
  taxes_per_passenger: 70,
  baggage_kg: 20,
  insurance: 40,
  extra_10kg: 60,
  drop_off: 42,
  lounge: 80,
  refund_fee: 100
};

export const CALENDAR_FARES = { '2026-07-21': 460, '2026-07-22': 320 };

export const PUBLISHED_FLIGHTS = [
  { number: 'CZ3401', origin: 'Chengdu', destination: 'Guangzhou', date: '2026-07-21',
    airline: 'China Southern', stops: 'nonstop', fare: 320, departure: '11:00',
    arrival: '13:40', on_time: '95%', taxes: 70 },
  { number: 'JD5162', origin: 'Chengdu', destination: 'Guangzhou', date: '2026-07-21',
    airline: 'Other airline', stops: 'stopover', fare: 460, departure: '09:00',
    arrival: '11:40', on_time: '88%', taxes: 70 },
  { number: 'MU5234', origin: 'Chengdu', destination: 'Guangzhou', date: '2026-07-21',
    airline: 'Other airline', stops: 'nonstop', fare: 580, departure: '07:30',
    arrival: '10:10', on_time: '91%', taxes: 70 }
];

export function flightsFor(origin, destination, date) {
  const o = String(origin || '').toLowerCase();
  const d = String(destination || '').toLowerCase();
  if (!o || !d || !date) return [];
  if (o === 'chengdu' && d === 'guangzhou') {
    if (date === '2026-07-21') return PUBLISHED_FLIGHTS.slice();
    if (date === '2026-07-22') {
      return PUBLISHED_FLIGHTS.filter(f => f.number === 'CZ3401').map(f => ({
        ...f, date: '2026-07-22'
      }));
    }
  }
  return [];
}

export function flightByNumber(number, date = '2026-07-21') {
  if (number === 'JD5162') {
    return PUBLISHED_FLIGHTS.find(f => f.number === 'JD5162');
  }
  if (number === 'CZ3401') {
    return { ...PUBLISHED_FLIGHTS.find(f => f.number === 'CZ3401'), date };
  }
  if (number === 'MU5234') {
    return { ...PUBLISHED_FLIGHTS.find(f => f.number === 'MU5234'), date };
  }
  return PUBLISHED_FLIGHTS.find(f => f.number === number);
}

export const BOOKING_CITIES = {
  Beijing: { code: 'PEK', group: 'Popular' },
  Shanghai: { code: 'SHA', group: 'Popular' },
  Guangzhou: { code: 'CAN', group: 'GHIJ' },
  Chengdu: { code: 'CTU', group: 'Popular' },
  Hangzhou: { code: 'HGH', group: 'GHIJ' },
  Shenzhen: { code: 'SZX', group: 'Popular' },
  Beihai: { code: 'BHY', group: 'ABCDEF' },
  'Mars City': { code: 'MRS', group: 'KLMNOP' },
  Chongqing: { code: 'CKG', group: 'ABCDEF' },
  Changchun: { code: 'CGQ', group: 'ABCDEF' },
  Guilin: { code: 'KWL', group: 'GHIJ' },
  Haikou: { code: 'HAK', group: 'GHIJ' },
  Jinan: { code: 'TNA', group: 'GHIJ' },
  Kunming: { code: 'KMG', group: 'KLMNOP' },
  Nanjing: { code: 'NKG', group: 'KLMNOP' },
  Qingdao: { code: 'TAO', group: 'QRSTUV' },
  Sanya: { code: 'SYX', group: 'QRSTUV' },
  Wuhan: { code: 'WUH', group: 'WXYZ' },
  Xiamen: { code: 'XMN', group: 'WXYZ' },
  'Xi\'an': { code: 'XIY', group: 'WXYZ' }
};

export const CITY_TABS = ['Popular', 'ABCDEF', 'GHIJ', 'KLMNOP', 'QRSTUV', 'WXYZ'];
