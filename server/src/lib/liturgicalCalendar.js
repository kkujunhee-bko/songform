/**
 * 절기 달력 계산 라이브러리
 * 한국 기독교 장로회(PCK) 및 주요 교단 절기 지원
 *
 * 모든 날짜 연산은 UTC 기준으로 수행한다.
 * - pg가 DATE를 'YYYY-MM-DD' 문자열로 반환 (db.js 설정 후)
 * - new Date('YYYY-MM-DD')는 UTC midnight → getUTCFullYear() 등 UTC 메서드 사용 필요
 * - new Date(year, month, day)는 local midnight이므로 시간대 오차 발생 → 사용 금지
 */

/** UTC 기준 날짜 생성 헬퍼 */
function utcDate(year, month1, day) {
  // month1: 1-based (1=January)
  return new Date(Date.UTC(year, month1 - 1, day));
}

/** 날짜에 일수 더하기 (ms 연산으로 UTC 안전) */
function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

/**
 * 입력값(문자열 또는 Date)을 UTC midnight Date로 정규화
 */
function parseToUtcDate(date) {
  if (typeof date === 'string') {
    // 'YYYY-MM-DD' 형식
    const [y, m, d] = date.split('-').map(Number);
    return utcDate(y, m, d);
  }
  // Date 객체인 경우 UTC 날짜 기준으로 재생성 (timezone 제거)
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Meeus/Jones/Butcher 알고리즘으로 부활절 날짜 계산 (UTC Date 반환)
 */
function computeEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/**
 * 대강절 첫째 주일 계산 (크리스마스 이전 4번째 일요일, UTC Date 반환)
 */
function computeAdventStart(year) {
  const christmas = utcDate(year, 12, 25); // Dec 25 UTC
  const dayOfWeek = christmas.getUTCDay(); // 0=Sun
  // 크리스마스 당일이 일요일이면 0일 전, 아니면 dayOfWeek일 전 → 가장 가까운 일요일
  const daysToLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  // 그 일요일에서 3주(21일) 더 빼면 4번째 전 일요일
  return addDays(christmas, -(daysToLastSunday + 21));
}

/**
 * 주어진 날짜에 해당하는 절기 정보 반환
 * denominationId: 1 = 한국 기독교 장로회 (기본)
 */
function getLiturgicalSeason(date, denominationId = 1) {
  const d = parseToUtcDate(date);
  const year = d.getUTCFullYear();

  // 부활절 기준 날짜들
  const easter     = computeEaster(year);
  const easterPrev = computeEaster(year - 1);
  const easterNext = computeEaster(year + 1);

  // 사순절 시작 (재의 수요일 = 부활절 46일 전)
  const ashWednesday     = addDays(easter, -46);
  const ashWednesdayNext = addDays(easterNext, -46);

  // 성령강림절 (부활절 후 49일 = 7번째 일요일)
  const pentecost     = addDays(easter, 49);
  const pentecostPrev = addDays(easterPrev, 49);

  // 대강절
  const adventStart     = computeAdventStart(year);
  const adventStartPrev = computeAdventStart(year - 1);

  const seasons = [
    // 대강절 (이전 연도)
    {
      name: '대강절',
      color: '#6B21A8',
      start: adventStartPrev,
      end: utcDate(year - 1, 12, 24),
    },
    // 성탄절 (Dec 25 ~ Jan 5)
    {
      name: '성탄절',
      color: '#DC2626',
      start: utcDate(year - 1, 12, 25),
      end: utcDate(year, 1, 5),
    },
    // 주현절 (Jan 6 ~ 사순절 전날)
    {
      name: '주현절',
      color: '#FFFFFF',
      start: utcDate(year, 1, 6),
      end: addDays(ashWednesday, -1),
    },
    // 사순절 (재의 수요일 ~ 부활절 전날)
    {
      name: '사순절',
      color: '#7C3AED',
      start: ashWednesday,
      end: addDays(easter, -1),
    },
    // 부활절 (부활절 ~ 성령강림절 전날)
    {
      name: '부활절',
      color: '#FFFFFF',
      start: easter,
      end: addDays(pentecost, -1),
    },
    // 성령강림절 (오순절 ~ 대강절 전날)
    {
      name: '성령강림절',
      color: '#DC2626',
      start: pentecost,
      end: addDays(adventStart, -1),
    },
    // 대강절 (현 연도)
    {
      name: '대강절',
      color: '#6B21A8',
      start: adventStart,
      end: utcDate(year, 12, 24),
    },
    // 성탄절 (Dec 25 ~ Dec 31)
    {
      name: '성탄절',
      color: '#DC2626',
      start: utcDate(year, 12, 25),
      end: utcDate(year, 12, 31),
    },
  ];

  // 다음 연도 초 (Jan 1 ~ 사순절 전날) — 12월에 차년도 날짜 선택 시 대응
  const nextYearSeasons = [
    // 차년도 성탄절 연장 (Jan 1~5)
    {
      name: '성탄절',
      color: '#DC2626',
      start: utcDate(year + 1, 1, 1),
      end: utcDate(year + 1, 1, 5),
    },
    // 차년도 주현절
    {
      name: '주현절',
      color: '#FFFFFF',
      start: utcDate(year + 1, 1, 6),
      end: addDays(ashWednesdayNext, -1),
    },
  ];

  const allSeasons = [...seasons, ...nextYearSeasons];

  for (const season of allSeasons) {
    if (d >= season.start && d <= season.end) {
      return {
        name: season.name,
        color: season.color,
        startDate: season.start.toISOString().slice(0, 10),
        endDate: season.end.toISOString().slice(0, 10),
      };
    }
  }

  // 기본값: 연중 주일
  return {
    name: '연중 주일',
    color: '#16A34A',
    startDate: null,
    endDate: null,
  };
}

/**
 * 해당 연도의 전체 절기 목록 반환
 */
function getYearlySeasons(year, denominationId = 1) {
  const easter       = computeEaster(year);
  const ashWednesday = addDays(easter, -46);
  const pentecost    = addDays(easter, 49);
  const adventStart  = computeAdventStart(year);

  return [
    { name: '대강절',    color: '#6B21A8', start: computeAdventStart(year - 1), end: utcDate(year - 1, 12, 24) },
    { name: '성탄절',    color: '#DC2626', start: utcDate(year - 1, 12, 25),    end: utcDate(year, 1, 5) },
    { name: '주현절',    color: '#D4AF37', start: utcDate(year, 1, 6),           end: addDays(ashWednesday, -1) },
    { name: '사순절',    color: '#7C3AED', start: ashWednesday,                  end: addDays(easter, -1) },
    { name: '부활절',    color: '#F59E0B', start: easter,                        end: addDays(pentecost, -1) },
    { name: '성령강림절', color: '#DC2626', start: pentecost,                    end: addDays(adventStart, -1) },
    { name: '대강절',    color: '#6B21A8', start: adventStart,                   end: utcDate(year, 12, 24) },
    { name: '성탄절',    color: '#DC2626', start: utcDate(year, 12, 25),         end: utcDate(year, 12, 31) },
  ].map((s) => ({
    ...s,
    startDate: s.start.toISOString().slice(0, 10),
    endDate:   s.end.toISOString().slice(0, 10),
  }));
}

module.exports = { getLiturgicalSeason, getYearlySeasons, computeEaster };
