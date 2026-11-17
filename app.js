const byId = id => document.getElementById(id);

// F1 车手与车队展示信息（面向用户的中文名、车队与车号）
const DRIVER_META = {
  'Max Verstappen': { cn: '维斯塔潘', team: '红牛车队 Red Bull', num: '#1', color: '#3671C6' },
  'Kimi Antonelli': { cn: '安东内利', team: '梅赛德斯 Mercedes', num: '#12', color: '#27F4D2' },
  'George Russell': { cn: '拉塞尔', team: '梅赛德斯 Mercedes', num: '#63', color: '#27F4D2' },
  'Charles Leclerc': { cn: '勒克莱尔', team: '法拉利 Ferrari', num: '#16', color: '#E8002D' },
  'Lewis Hamilton': { cn: '汉密尔顿', team: '法拉利 Ferrari', num: '#44', color: '#E8002D' },
  'Lando Norris': { cn: '诺里斯', team: '迈凯伦 McLaren', num: '#4', color: '#FF8000' },
  'Oscar Piastri': { cn: '皮亚斯特里', team: '迈凯伦 McLaren', num: '#81', color: '#FF8000' },
  'Isack Hadjar': { cn: '哈贾尔', team: '红牛车队 Red Bull', num: '#6', color: '#3671C6' },
  'Liam Lawson': { cn: '劳森', team: '小红牛 Racing Bulls', num: '#30', color: '#6692FF' },
  'Pierre Gasly': { cn: '加斯利', team: '阿尔派 Alpine', num: '#10', color: '#FF87BC' },
  'Arvid Lindblad': { cn: '林德布拉德', team: '小红牛 Racing Bulls', num: '#40', color: '#6692FF' },
  'Franco Colapinto': { cn: '科拉平托', team: '阿尔派 Alpine', num: '#43', color: '#FF87BC' },
  'Gabriel Bortoleto': { cn: '博托莱托', team: '奥迪 Audi', num: '#5', color: '#00E701' },
  'Nico Hulkenberg': { cn: '霍肯伯格', team: '奥迪 Audi', num: '#27', color: '#00E701' },
  'Oliver Bearman': { cn: '贝尔曼', team: '哈斯 Haas', num: '#87', color: '#B6BABD' },
  'Carlos Sainz': { cn: '塞恩斯', team: '威廉姆斯 Williams', num: '#55', color: '#64C4FF' },
  'Alexander Albon': { cn: '阿尔本', team: '威廉姆斯 Williams', num: '#23', color: '#64C4FF' },
  'Fernando Alonso': { cn: '阿隆索', team: '阿斯顿·马丁 Aston Martin', num: '#14', color: '#229971' },
  'Rafael Câmara': { cn: '卡马拉', team: '哈斯 Haas', num: '#88', color: '#B6BABD' },
  'Lance Stroll': { cn: '斯特罗尔', team: '阿斯顿·马丁 Aston Martin', num: '#18', color: '#229971' },
  'Sergio Perez': { cn: '佩雷兹', team: '凯迪拉克 Cadillac', num: '#11', color: '#D4AF37' },
  'Valtteri Bottas': { cn: '博塔斯', team: '凯迪拉克 Cadillac', num: '#77', color: '#D4AF37' },
};

const TEAM_META = {
  'Red Bull Racing': { cn: '红牛车队', desc: 'Red Bull Racing', color: '#3671C6' },
  'Mercedes': { cn: '梅赛德斯车队', desc: 'Mercedes-AMG', color: '#27F4D2' },
  'Ferrari': { cn: '法拉利车队', desc: 'Scuderia Ferrari', color: '#E8002D' },
  'McLaren': { cn: '迈凯伦车队', desc: 'McLaren Formula 1', color: '#FF8000' },
  'Aston Martin': { cn: '阿斯顿·马丁车队', desc: 'Aston Martin Aramco', color: '#229971' },
  'Alpine': { cn: '阿尔派车队', desc: 'BWT Alpine', color: '#FF87BC' },
  'Williams': { cn: '威廉姆斯车队', desc: 'Williams Racing', color: '#64C4FF' },
  'Racing Bulls': { cn: '小红牛车队', desc: 'Visa Cash App RB', color: '#6692FF' },
  'Audi': { cn: '奥迪车队', desc: 'Audi F1 Team', color: '#00E701' },
  'Haas F1 Team': { cn: '哈斯车队', desc: 'MoneyGram Haas', color: '#B6BABD' },
  'Cadillac': { cn: '凯迪拉克车队', desc: 'Cadillac F1 Team', color: '#D4AF37' },
  'Tied': { cn: '最高分并列平局', desc: '多支车队并列最高分', color: '#E20700' },
};

const CHOICE_META = {
  'Q3': { cn: 'Q3（前 10 杆位争夺）', sub: '排位赛第三阶段' },
  'Q2': { cn: 'Q2（第 11–16 名）', sub: '排位赛第二阶段' },
  'Q1': { cn: 'Q1（首轮止步）', sub: '排位赛第一阶段' },
  '<15': { cn: '少于 15 人 (<15)', sub: '完赛人数档位' },
  '15': { cn: '15 人', sub: '完赛人数档位' },
  '16': { cn: '16 人', sub: '完赛人数档位' },
  '17': { cn: '17 人', sub: '完赛人数档位' },
  '18': { cn: '18 人', sub: '完赛人数档位' },
  '19': { cn: '19 人', sub: '完赛人数档位' },
  '>19': { cn: '超过 19 人 (>19)', sub: '完赛人数档位' },
  'Podium': { cn: '登上领奖台 (前 3)', sub: '完赛名次区间' },
  '4th - 10th': { cn: '第 4 – 10 名', sub: '积分区完赛' },
  '11th - 22nd': { cn: '第 11 – 22 名', sub: '完赛未得分' },
  'Not Classified': { cn: '未完赛 / 未分类', sub: '正赛结果' },
};

const ROUND_CN_NAMES = {
  '2026 Las Vegas Grand Prix': '2026 拉斯维加斯大奖赛',
};

// 模型标识转为展示名称；未登记的标识原样展示
const MODEL_NAMES = {
  'deepseek-flash': 'DeepSeek Flash',
};
const modelName = id => MODEL_NAMES[id] ?? id ?? '—';

// 预测轮次展示格式化（同时支持轮次编号与整点批次时间）
function formatBatchTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:00 批次`;
}
function formatRunTitle(runId, iso) {
  const runPart = runId ? `第 ${runId} 轮预测` : '当前预测轮次';
  return iso ? `${runPart} · ${formatBatchTime(iso)}` : runPart;
}
function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const QUESTION_META = {
  1: { category: '领奖台前三', group: 'PODIUM', cnTitle: '预测 2026 拉斯维加斯大奖赛领奖台前三名', ruleDesc: '按名次选 3 人 · 全中翻倍 ×2' },
  2: { category: '排位赛杆位', group: 'QUALIFYING', cnTitle: '谁将成为排位赛最快车手（Q3 第一名）？', ruleDesc: '单选 1 人' },
  3: { category: '梅赛德斯队内对比', group: 'QUALIFYING', cnTitle: '梅赛德斯两位车手谁在排位赛名次更高？', ruleDesc: '二选一' },
  4: { category: '威廉姆斯晋级深度', group: 'QUALIFYING', cnTitle: '威廉姆斯赛车在排位赛最远能闯入哪个阶段？', ruleDesc: '三选一' },
  5: { category: '正赛最快单圈', group: 'RACE', cnTitle: '谁将在正赛中跑出全场最快单圈？', ruleDesc: '单选 1 人' },
  6: { category: '最快进站车队', group: 'RACE', cnTitle: '哪支车队将创造正赛最快进站时间？', ruleDesc: '单选 1 队' },
  7: { category: '中游四人正赛对决', group: 'RACE', cnTitle: '加斯利、霍肯伯格、贝尔曼、斯特罗尔谁正赛名次最高？', ruleDesc: '四选一' },
  8: { category: '正赛完赛人数', group: 'RACE', cnTitle: '本场正赛最终会有多少名车手获得有效完赛名次？', ruleDesc: '七档选一' },
  9: { category: '新秀完赛区间', group: 'RACE', cnTitle: '新秀拉斐尔·卡马拉（Rafael Câmara）将以什么名次完赛？', ruleDesc: '四档选一' },
  10: { category: '争冠车队单站积分', group: 'RACE', cnTitle: '红牛、法拉利、迈凯伦哪支车队将在本站拿到最多积分？', ruleDesc: '四选一' },
};

const DRIVERS_22 = [
  ['131', 'Max Verstappen', { 1: '5', 2: '10', 5: '10' }],
  ['11161', 'Kimi Antonelli', { 1: '8', 2: '12', 5: '12' }],
  ['124', 'George Russell', { 1: '10', 2: '15', 5: '12' }],
  ['115', 'Charles Leclerc', { 1: '12', 2: '15', 5: '15' }],
  ['110', 'Lewis Hamilton', { 1: '14', 2: '16', 5: '15' }],
  ['117', 'Lando Norris', { 1: '15', 2: '18', 5: '18' }],
  ['1982', 'Oscar Piastri', { 1: '18', 2: '20', 5: '20' }],
  ['11032', 'Isack Hadjar', { 1: '20', 2: '30', 5: '30' }],
  ['114', 'Liam Lawson', { 1: '30', 2: '35', 5: '35' }],
  ['18', 'Pierre Gasly', { 1: '35', 2: '40', 5: '40' }],
  ['11149', 'Arvid Lindblad', { 1: '35', 2: '40', 5: '40' }],
  ['11059', 'Franco Colapinto', { 1: '40', 2: '40', 5: '40' }],
  ['11051', 'Gabriel Bortoleto', { 1: '40', 2: '40', 5: '40' }],
  ['111', 'Nico Hulkenberg', { 1: '40', 2: '45', 5: '45' }],
  ['11031', 'Oliver Bearman', { 1: '45', 2: '50', 5: '50' }],
  ['125', 'Carlos Sainz', { 1: '50', 2: '50', 5: '50' }],
  ['11', 'Alexander Albon', { 1: '50', 2: '50', 5: '50' }],
  ['12', 'Fernando Alonso', { 1: '50', 2: '55', 5: '55' }],
  ['11205', 'Rafael Câmara', { 1: '55', 2: '55', 5: '55' }],
  ['129', 'Lance Stroll', { 1: '55', 2: '58', 5: '58' }],
  ['121', 'Sergio Perez', { 1: '60', 2: '58', 5: '60' }],
  ['13', 'Valtteri Bottas', { 1: '60', 2: '60', 5: '60' }],
];

function buildDriverOptions(qNo, prefix) {
  return DRIVERS_22.map(([source_id, label, ptsMap]) => ({
    option_key: `${prefix}:${source_id}`,
    source_id,
    source_type: 'DRIVER',
    label,
    points: ptsMap[qNo],
  }));
}

// 过滤掉后端技术术语，将预测解释转换为面向车迷的自然说明
function cleanExplanationForUser(raw) {
  if (!raw) return '';
  return raw
    .replace(/，?且该题选项键与题目\s*\d+\s*的形式相同（均为官方原样键，未跨题拼接）/g, '')
    .replace(/（查询\s*[\d、,\s]+）/g, '')
    .replace(/按当前\s*option\.label\s*对齐后/g, '')
    .replace(/session_key\s*\d+/gi, '上一站赛事')
    .replace(/OpenF1\s*driver_number\s*与官方\s*source_id\/option_key\s*不是同一标识；?/gi, '')
    .replace(/deadline_verified=false/gi, '赛前阶段')
    .replace(/冻结\s*wire\s*契约/gi, '官方最终赛果')
    .trim();
}

// 计算每小时预测任务的确定性 UUIDv5 (NAMESPACE_URL + "f1ap:hourly:<roundId>:<hourIso>")
const NAMESPACE_URL_BYTES = new Uint8Array([
  0x6b, 0xa7, 0xb8, 0x11, 0x9d, 0xad, 0x11, 0xd1,
  0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8,
]);

async function hourlyRequestId(roundId, dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const h = String(dateObj.getUTCHours()).padStart(2, '0');
  const nameBytes = new TextEncoder().encode(`f1ap:hourly:${roundId}:${y}-${m}-${d}T${h}:00:00+00:00`);
  const input = new Uint8Array(NAMESPACE_URL_BYTES.length + nameBytes.length);
  input.set(NAMESPACE_URL_BYTES, 0);
  input.set(nameBytes, NAMESPACE_URL_BYTES.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', input));
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// 第 21 站（2026 拉斯维加斯大奖赛）赛题与第 111 轮 AI 预测快照
const VEGAS_ROUND_DATA = {
  round_id: '140',
  run_id: '111',
  request_id: '1a6abe8b-eb6c-57c5-9140-bf5ced2b2511',
  season_year: 2026,
  source_gameday_id: '21',
  display_name: '2026 Las Vegas Grand Prix',
  model: 'deepseek-flash',
  data_cutoff_at: '2026-11-17T08:00:00.000Z',
  generated_at: '2026-11-17T08:07:38.079Z',
  questions: [
    {
      question_id: '1251',
      source_question_id: '760',
      no: 1,
      text: 'Predict the podium for the 2026 Las Vegas Grand Prix.\nGet the points when your picks finish in the top 3. Predict the exact position? You score double.',
      rule: { min_picks: 3, max_picks: 3, ordered: true },
      options: buildDriverOptions(1, '1'),
    },
    {
      question_id: '1252',
      source_question_id: '761',
      no: 2,
      text: "Who'll be the fastest driver in qualifying?\nWhich driver will top Q3?",
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: buildDriverOptions(2, '2'),
    },
    {
      question_id: '1253',
      source_question_id: '762',
      no: 3,
      text: 'Who qualifies highest for the Las Vegas Grand Prix?\nHow will the Mercedes drivers compare in Las Vegas?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '7:11161', source_id: '11161', source_type: 'DRIVER', label: 'Kimi Antonelli', points: '10' },
        { option_key: '7:124', source_id: '124', source_type: 'DRIVER', label: 'George Russell', points: '15' },
      ],
    },
    {
      question_id: '1254',
      source_question_id: '763',
      no: 4,
      text: 'What is the furthest a Williams car will progress in qualifying?\nCan Williams carry their São Paulo momentum into Las Vegas?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '4:1', source_id: '1', source_type: 'CHOICE', label: 'Q3', points: '20' },
        { option_key: '4:2', source_id: '2', source_type: 'CHOICE', label: 'Q2', points: '10' },
        { option_key: '4:3', source_id: '3', source_type: 'CHOICE', label: 'Q1', points: '15' },
      ],
    },
    {
      question_id: '1255',
      source_question_id: '764',
      no: 5,
      text: 'Who will set the fastest lap time of the race?\nMax claimed the fastest lap here last year. Can he go back-to-back?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: buildDriverOptions(5, '2'),
    },
    {
      question_id: '1256',
      source_question_id: '765',
      no: 6,
      text: 'Which team will set the fastest pitstop time of the race?\nLas Vegas usually favours a one-stop strategy, putting extra pressure on the pit crews.',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '2:29', source_id: '29', source_type: 'CONSTRUCTOR', label: 'Red Bull Racing', points: '10' },
        { option_key: '2:28', source_id: '28', source_type: 'CONSTRUCTOR', label: 'Mercedes', points: '12' },
        { option_key: '2:2636', source_id: '2636', source_type: 'CONSTRUCTOR', label: 'Racing Bulls', points: '15' },
        { option_key: '2:25', source_id: '25', source_type: 'CONSTRUCTOR', label: 'Ferrari', points: '20' },
        { option_key: '2:27', source_id: '27', source_type: 'CONSTRUCTOR', label: 'McLaren', points: '25' },
        { option_key: '2:2640', source_id: '2640', source_type: 'CONSTRUCTOR', label: 'Audi', points: '28' },
        { option_key: '2:24', source_id: '24', source_type: 'CONSTRUCTOR', label: 'Aston Martin', points: '30' },
        { option_key: '2:210', source_id: '210', source_type: 'CONSTRUCTOR', label: 'Williams', points: '35' },
        { option_key: '2:23', source_id: '23', source_type: 'CONSTRUCTOR', label: 'Alpine', points: '40' },
        { option_key: '2:2641', source_id: '2641', source_type: 'CONSTRUCTOR', label: 'Cadillac', points: '45' },
        { option_key: '2:26', source_id: '26', source_type: 'CONSTRUCTOR', label: 'Haas F1 Team', points: '50' },
      ],
    },
    {
      question_id: '1257',
      source_question_id: '766',
      no: 7,
      text: 'Which driver finishes ahead in Grand Prix?\nWhich midfield driver can get the better of their rivals?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '4:18', source_id: '18', source_type: 'DRIVER', label: 'Pierre Gasly', points: '10' },
        { option_key: '4:111', source_id: '111', source_type: 'DRIVER', label: 'Nico Hulkenberg', points: '15' },
        { option_key: '4:11031', source_id: '11031', source_type: 'DRIVER', label: 'Oliver Bearman', points: '20' },
        { option_key: '4:129', source_id: '129', source_type: 'DRIVER', label: 'Lance Stroll', points: '30' },
      ],
    },
    {
      question_id: '1258',
      source_question_id: '767',
      no: 8,
      text: 'How many classified finishers?\nMcLaren’s double disqualification last year meant an unusually high number of drivers went unclassified.',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '6:1', source_id: '1', source_type: 'CHOICE', label: '<15', points: '30' },
        { option_key: '6:2', source_id: '2', source_type: 'CHOICE', label: '15', points: '25' },
        { option_key: '6:3', source_id: '3', source_type: 'CHOICE', label: '16', points: '20' },
        { option_key: '6:4', source_id: '4', source_type: 'CHOICE', label: '17', points: '15' },
        { option_key: '6:5', source_id: '5', source_type: 'CHOICE', label: '18', points: '10' },
        { option_key: '6:6', source_id: '6', source_type: 'CHOICE', label: '19', points: '15' },
        { option_key: '6:7', source_id: '7', source_type: 'CHOICE', label: '>19', points: '20' },
      ],
    },
    {
      question_id: '1259',
      source_question_id: '768',
      no: 9,
      text: 'Where will Rafael Câmara finish the race?\nF1’s newest driver certainly had a home Grand Prix to remember. How will he fare this time around?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '4:1', source_id: '1', source_type: 'CHOICE', label: 'Podium', points: '40' },
        { option_key: '4:2', source_id: '2', source_type: 'CHOICE', label: '4th - 10th', points: '20' },
        { option_key: '4:3', source_id: '3', source_type: 'CHOICE', label: '11th - 22nd', points: '10' },
        { option_key: '4:4', source_id: '4', source_type: 'CHOICE', label: 'Not Classified', points: '15' },
      ],
    },
    {
      question_id: '1260',
      source_question_id: '769',
      no: 10,
      text: 'Which of these teams will score the most points?\nMercedes wrapped up the Championship in Brazil. Which rival will pick up the most points in Las Vegas?',
      rule: { min_picks: 1, max_picks: 1, ordered: false },
      options: [
        { option_key: '4:1', source_id: '1', source_type: 'CHOICE', label: 'Red Bull Racing', points: '10' },
        { option_key: '4:2', source_id: '2', source_type: 'CHOICE', label: 'Ferrari', points: '15' },
        { option_key: '4:3', source_id: '3', source_type: 'CHOICE', label: 'McLaren', points: '20' },
        { option_key: '4:4', source_id: '4', source_type: 'CHOICE', label: 'Tied', points: '30' },
      ],
    },
  ],
  predictions: {
    '760': {
      status: 'PREDICTED',
      picks: ['1:124', '1:11161', '1:117'],
      explanation: '参考场梅赛德斯双车圈速处于前列（拉塞尔 1:29.283、安东内利 1:29.159），诺里斯 1:27.621 为样本最快圈之一；综合单圈与长距离稳定性，推荐拉塞尔、安东内利、诺里斯作为领奖台前三顺序。',
    },
    '761': {
      status: 'PREDICTED',
      picks: ['2:124'],
      explanation: '赛前按近期单圈速度表现外推，拉塞尔与安东内利圈速接近且稳定居前，推荐拉塞尔争夺本站排位赛杆位。',
    },
    '762': {
      status: 'PREDICTED',
      picks: ['7:124'],
      explanation: '梅赛德斯队内对比中，拉塞尔（第 70 圈 1:27.394、第 71 圈 1:29.283）与安东内利（1:27.999、1:29.159）非常接近，连续圈速拉塞尔略占优势，推荐乔治·拉塞尔。',
    },
    '763': {
      status: 'PREDICTED',
      picks: ['4:1'],
      explanation: '威廉姆斯车手阿尔本与塞恩斯近期单圈节奏稳定（约 1:30.7），结合拉斯维加斯长直道对威廉姆斯底盘特性的加成，看好至少一台赛车闯入 Q3。',
    },
    '764': {
      status: 'PREDICTED',
      picks: ['2:124'],
      explanation: '正赛最快单圈通常由领跑集团或末段换胎冲刺车手创造；参考场拉塞尔与安东内利整体圈速位列前茅，推荐拉塞尔拿下正赛最快单圈。',
    },
    '765': {
      status: 'PREDICTED',
      picks: ['2:28'],
      explanation: '近期维修区换胎记录中，梅赛德斯车组为拉塞尔（2.7 秒）与安东内利（2.9 秒）完成了快速且稳定的双车停站，整体换胎表现均衡，推荐梅赛德斯车队。',
    },
    '766': {
      status: 'PREDICTED',
      picks: ['4:11031'],
      explanation: '四位中游车手对比中，哈斯车队的贝尔曼近期正赛长距离节奏完整稳定，而加斯利受进站策略拖累、霍肯伯格曾遭遇罚时影响，因此更看好贝尔曼在正赛完赛顺位中领跑。',
    },
    '767': {
      status: 'PREDICTED',
      picks: ['6:5'],
      explanation: '结合现代 F1 分站平均完赛率与街道赛常见的零星退赛损耗，预计本场正赛有 18 台赛车获得最终分类完赛名次。',
    },
    '768': {
      status: 'PREDICTED',
      picks: ['4:3'],
      explanation: '新秀卡马拉近期正赛长距离圈速（约 1:29.163–1:32.063）处于中后段集团，预计本场正赛稳健完赛落点在第 11 – 22 名区间。',
    },
    '769': {
      status: 'PREDICTED',
      picks: ['4:3'],
      explanation: '迈凯伦双雄（诺里斯 1:27.621、皮亚斯特里 1:28.022）近期正赛圈速双双处于第一集团；在红牛、法拉利与迈凯伦三强对比中，最看好迈凯伦车队斩获单站最高积分。',
    },
  },
};

// 已知的预测轮次历史记录（支持在页面切换查看不同预测轮次）
const PREDICTION_RUNS = new Map([
  [
    '111',
    {
      run_id: '111',
      request_id: '1a6abe8b-eb6c-57c5-9140-bf5ced2b2511',
      model: 'deepseek-flash',
      data_cutoff_at: '2026-11-17T08:00:00.000Z',
      generated_at: '2026-11-17T08:07:38.079Z',
      predictions: structuredClone(VEGAS_ROUND_DATA.predictions),
    },
  ],
  [
    '109',
    {
      run_id: '109',
      request_id: 'e03f604e-5362-57d4-99d7-3ea5c9e6b09d',
      model: 'deepseek-flash',
      data_cutoff_at: '2026-11-17T03:00:00.000Z',
      generated_at: '2026-11-17T03:44:26.199Z',
      predictions: {
        '760': {
          status: 'PREDICTED',
          picks: ['1:117', '1:131', '1:115'],
          explanation: '参考近期比赛末段长距离巡航节奏，诺里斯单圈表现最快（1:27.621），维斯塔潘（1:27.947）与勒克莱尔（1:28.037）紧随其后；推荐按诺里斯、维斯塔潘、勒克莱尔顺序冲击领奖台前三。',
        },
        '761': {
          status: 'PREDICTED',
          picks: ['2:117'],
          explanation: '参考近期样本中诺里斯最突出的单圈速度表现（1:27.621），推荐诺里斯争夺本站排位赛杆位。',
        },
        '762': {
          status: 'PREDICTED',
          picks: ['7:11161'],
          explanation: '梅赛德斯队内对比中，安东内利在近期同圈对比中的最快单圈（1:29.159）微弱领先于拉塞尔（1:29.283），略微看好安东内利排位占优。',
        },
        '763': {
          status: 'DATA_INSUFFICIENT',
          picks: [],
          explanation: '该轮次尚无拉斯维加斯站自由练习赛与排位赛单圈数据，暂未对威廉姆斯晋级阶段作出推荐。',
        },
        '764': {
          status: 'PREDICTED',
          picks: ['2:117'],
          explanation: '诺里斯在近期比赛末段展现出极佳的轻油长距离与单圈冲刺速度，推荐诺里斯刷出正赛最快单圈。',
        },
        '765': {
          status: 'PREDICTED',
          picks: ['2:27'],
          explanation: '维修区换胎样本中迈凯伦车组已有 2.2 秒的高效静止换胎表现，推荐迈凯伦拿下最快进站。',
        },
        '766': {
          status: 'PREDICTED',
          picks: ['4:111'],
          explanation: '四位中游车手对比中，霍肯伯格在该批次样本中圈速突出（1:27.930），看好霍肯伯格在正赛中排名最靠前。',
        },
        '767': {
          status: 'DATA_INSUFFICIENT',
          picks: [],
          explanation: '该轮次缺乏完整完赛统计依据，暂未锁定具体完赛人数档位。',
        },
        '768': {
          status: 'PREDICTED',
          picks: ['4:3'],
          explanation: '新秀卡马拉近期正赛长距离圈速处于中下游集团（约 1:32.063），预计稳健完赛落点在第 11 – 22 名区间。',
        },
        '769': {
          status: 'PREDICTED',
          picks: ['4:3'],
          explanation: '迈凯伦与红牛近期正赛节奏最为强势，其中迈凯伦兼具单圈速度与进站效率优势，看好迈凯伦收获最高车队积分。',
        },
      },
    },
  ],
]);

const refreshBtn = byId('refresh');
const roundSelect = byId('round');
const predRunSelect = byId('pred-run-select');
const searchInput = byId('question-search');
let detailGeneration = 0;
let activeFilter = 'ALL';
let expandedQuestions = new Set();
let currentState = structuredClone(VEGAS_ROUND_DATA);
let connectionInfo = {
  checking: true,
  online: false,
  proxyOutdated: false,
  livePredictionSynced: false,
  syncNote: '',
  latencyMs: null,
  host: 'API 服务',
  checkedAt: null,
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function getOptionAccentColor(option) {
  if (DRIVER_META[option.label]) return DRIVER_META[option.label].color;
  if (TEAM_META[option.label]) return TEAM_META[option.label].color;
  return '#E20700';
}

function getOptionShortName(option) {
  const dm = DRIVER_META[option.label];
  if (dm) return dm.cn;
  const tm = TEAM_META[option.label];
  if (tm) return tm.cn;
  const cm = CHOICE_META[option.label];
  if (cm) return cm.cn;
  return option.label;
}

function getOptionDisplayTitle(option) {
  const dm = DRIVER_META[option.label];
  if (dm) return `${dm.cn} · ${option.label}`;
  const tm = TEAM_META[option.label];
  if (tm) return tm.cn;
  const cm = CHOICE_META[option.label];
  if (cm) return cm.cn;
  return option.label;
}

function getOptionDisplaySubtitle(option) {
  const dm = DRIVER_META[option.label];
  if (dm) return `${dm.team} ${dm.num}`;
  const tm = TEAM_META[option.label];
  if (tm) return tm.desc;
  const cm = CHOICE_META[option.label];
  if (cm) return cm.sub;
  return '';
}

function findOption(question, keyOrId) {
  return question.options.find(
    o => o.option_key === keyOrId || o.source_id === keyOrId || o.option_key.endsWith(`:${keyOrId}`)
  );
}

// 渲染精简的候选分值标签列表（小候选题直接平铺，大候选题默认折叠）
function renderOptionsBlock(question, pickedKeys, keyword) {
  const area = el('div', 'options-area');
  const pickedSet = new Set(pickedKeys ?? []);
  const isLargePool = question.options.length > 4;
  const isExpanded = expandedQuestions.has(question.no) || Boolean(keyword);

  if (!isLargePool || isExpanded) {
    const chips = el('div', 'options-chips');
    for (const opt of question.options) {
      const isPicked = pickedSet.has(opt.option_key);
      const pill = el('div', `opt-pill${isPicked ? ' is-picked' : ''}`);
      const dot = el('span', 'opt-dot');
      dot.style.background = getOptionAccentColor(opt);
      pill.append(dot, el('span', 'opt-name', getOptionShortName(opt)));
      if (opt.points) {
        pill.append(el('span', 'opt-pts', `${opt.points}分`));
      }
      chips.append(pill);
    }
    area.append(chips);
  }

  if (isLargePool && !keyword) {
    const btn = el(
      'button',
      'toggle-options-btn',
      isExpanded ? '收起候选与分值 ▲' : `查看全部 ${question.options.length} 个候选与分值 ▾`
    );
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (expandedQuestions.has(question.no)) expandedQuestions.delete(question.no);
      else expandedQuestions.add(question.no);
      renderQuestionsGrid();
    });
    area.append(btn);
  }

  return area;
}

function questionMatchesSearch(question, qMeta, pred, keyword) {
  if (!keyword) return true;
  const haystack = [
    question.text,
    qMeta.cnTitle,
    qMeta.category,
    pred?.explanation ?? '',
    ...question.options.map(o => `${o.label} ${getOptionDisplayTitle(o)} ${getOptionDisplaySubtitle(o)}`),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword);
}

// 渲染 Q1 领奖台专属展台（不与下方列表重复）
function renderPodium(question, pred, keyword) {
  const section = byId('podium-section');
  const container = byId('podium-showcase');
  container.replaceChildren();

  const q1Meta = QUESTION_META[1];
  const filterAllows = activeFilter === 'ALL' || activeFilter === 'PODIUM';
  const searchMatches = question && questionMatchesSearch(question, q1Meta, pred, keyword);

  if (!question || !filterAllows || !searchMatches) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  const wrap = el('div', 'podium-wrap');
  const stage = el('div', 'podium-stage');

  // F1 转播席顺序：左 P2，中 P1，右 P3
  const orderLayout = [
    { rank: 2, pickIndex: 1, cls: 'pos-2', title: 'P2 亚军' },
    { rank: 1, pickIndex: 0, cls: 'pos-1', title: 'P1 冠军' },
    { rank: 3, pickIndex: 2, cls: 'pos-3', title: 'P3 季军' },
  ];

  const picks = pred?.picks ?? [];

  for (const slot of orderLayout) {
    const step = el('div', `podium-step ${slot.cls}`);
    const rankRow = el('div', 'podium-rank-row');
    rankRow.append(el('span', 'podium-pos-badge', slot.title));

    const optKey = picks[slot.pickIndex];
    const opt = optKey ? findOption(question, optKey) : null;
    const ptsText = opt?.points ? `${opt.points} 分 · 全中 ${Number(opt.points) * 2} 分` : '待定';
    rankRow.append(el('span', 'podium-pts-badge', ptsText));
    step.append(rankRow);

    const driverRow = el('div', 'podium-driver-row');
    const bar = el('span', 'team-bar');
    bar.style.background = opt ? getOptionAccentColor(opt) : '#555';
    driverRow.append(bar);

    const info = el('div');
    if (opt) {
      const dm = DRIVER_META[opt.label];
      info.append(
        el('div', 'podium-driver-name', dm ? dm.cn : opt.label),
        el('div', 'podium-driver-team', dm ? `${opt.label} · ${dm.team}` : '')
      );
    } else {
      info.append(
        el('div', 'podium-driver-name', '暂未推荐'),
        el('div', 'podium-driver-team', '等待更多数据')
      );
    }
    driverRow.append(info);
    step.append(driverRow);
    stage.append(step);
  }

  wrap.append(stage);

  if (pred?.explanation) {
    wrap.append(el('p', 'podium-reason', cleanExplanationForUser(pred.explanation)));
  }

  wrap.append(renderOptionsBlock(question, pred?.picks, keyword));
  container.append(wrap);
}

// 渲染 Q2–Q10 赛题卡片
function renderQuestionsGrid() {
  const section = byId('questions-section');
  const container = byId('results');
  container.replaceChildren();

  const keyword = (searchInput?.value ?? '').trim().toLowerCase();
  const questions = currentState.questions ?? [];

  const q1 = questions.find(q => q.no === 1);
  const q1Pred = q1 ? currentState.predictions?.[q1.source_question_id] : null;
  renderPodium(q1, q1Pred, keyword);

  if (activeFilter === 'PODIUM') {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  let visibleCount = 0;

  for (const q of questions) {
    if (q.no === 1) continue; // 第 1 题已在领奖台展台呈现，避免重复

    const qMeta = QUESTION_META[q.no] ?? {
      category: `Q${q.no}`,
      group: 'RACE',
      cnTitle: `第 ${q.no} 题`,
      ruleDesc: '单选 1 项',
    };
    const pred = currentState.predictions?.[q.source_question_id] ?? {
      status: 'DATA_INSUFFICIENT',
      picks: [],
      explanation: '当前暂无该题的赛前预测建议。',
    };

    if (activeFilter === 'QUALIFYING' && qMeta.group !== 'QUALIFYING') continue;
    if (activeFilter === 'RACE' && qMeta.group !== 'RACE') continue;
    if (!questionMatchesSearch(q, qMeta, pred, keyword)) continue;

    visibleCount++;
    const isInsufficient = pred.status !== 'PREDICTED';
    const card = el('article', `q-card${isInsufficient ? ' q-card-insufficient' : ''}`);

    // 卡片头部
    const header = el('div', 'q-card-header');
    const numGroup = el('div', 'q-number-group');
    numGroup.append(
      el('span', 'q-no', `Q${String(q.no).padStart(2, '0')}`),
      el('span', 'q-category', qMeta.category)
    );
    header.append(numGroup, el('span', 'q-rule-pill', qMeta.ruleDesc));
    card.append(header);

    // 中文题面
    card.append(el('h3', 'q-title-cn', qMeta.cnTitle));

    // AI 推荐结果与理由
    const predBox = el('div', `prediction-box${isInsufficient ? ' box-insufficient' : ''}`);
    const pickRow = el('div', 'pick-row');
    const pickMain = el('div', 'pick-main');

    if (isInsufficient || !pred.picks?.length) {
      pickMain.append(
        el('span', 'pick-badge', '暂缓推荐'),
        el('span', 'pick-sub', '待自由练习赛数据补充')
      );
      pickRow.append(pickMain);
    } else {
      const opt = findOption(q, pred.picks[0]);
      pickMain.append(
        el('span', 'pick-badge', 'AI 推荐'),
        el('span', 'pick-name', opt ? getOptionDisplayTitle(opt) : pred.picks[0])
      );
      const sub = opt ? getOptionDisplaySubtitle(opt) : '';
      if (sub) pickMain.append(el('span', 'pick-sub', sub));
      pickRow.append(pickMain);
      if (opt?.points) {
        pickRow.append(el('span', 'pick-pts', `${opt.points} 分`));
      }
    }
    predBox.append(pickRow);

    if (pred.explanation) {
      predBox.append(el('p', 'pred-explanation', cleanExplanationForUser(pred.explanation)));
    }
    card.append(predBox);

    // 精简候选选项区
    card.append(renderOptionsBlock(q, pred.picks, keyword));
    container.append(card);
  }

  if (visibleCount === 0 && byId('podium-section').hidden) {
    container.append(el('p', 'section-note', '未找到匹配的赛题或车手，请尝试其他关键词。'));
  }
}

function renderInsightsPanel() {
  // 底部说明已精简为静态提示条，保留空钩子兼容调用链
}

// 刷新预测轮次下拉框
function syncRunSelectOptions(selectedRunId) {
  if (!predRunSelect) return;
  const sorted = [...PREDICTION_RUNS.values()].sort((a, b) => Number(b.run_id) - Number(a.run_id));
  predRunSelect.replaceChildren();
  sorted.forEach((run, idx) => {
    const timeShort = formatBatchTime(run.data_cutoff_at).replace(' 批次', '');
    const labelText = `第 ${run.run_id} 轮 · ${timeShort}${idx === 0 ? ' (最新)' : ''}`;
    predRunSelect.add(new Option(labelText, String(run.run_id)));
  });
  if (selectedRunId && PREDICTION_RUNS.has(String(selectedRunId))) {
    predRunSelect.value = String(selectedRunId);
  }
}

// 刷新连接状况显示（顶部导航栏与分站概览）
function renderConnectionStatus() {
  const badge = byId('conn-badge');
  const dot = byId('conn-dot');
  const stateText = byId('conn-state');
  const hostText = byId('conn-host');
  const heroStatus = byId('pred-conn-status');
  const heroDetail = byId('pred-conn-detail');

  badge.classList.remove('is-online', 'is-offline');
  dot.classList.remove('checking', 'offline');

  if (connectionInfo.checking) {
    dot.classList.add('checking');
    stateText.textContent = '检测中…';
    hostText.textContent = connectionInfo.host;
    heroStatus.textContent = '检测中…';
    heroDetail.textContent = connectionInfo.host;
    return;
  }

  if (connectionInfo.online) {
    badge.classList.add('is-online');
    const latency = connectionInfo.latencyMs != null ? ` · ${connectionInfo.latencyMs}ms` : '';
    stateText.textContent = connectionInfo.proxyOutdated ? '代理需重启' : `已连接${latency}`;
    hostText.textContent = connectionInfo.host;
    heroStatus.textContent = connectionInfo.livePredictionSynced ? '服务已连接' : '服务已连接（未同步）';
    heroDetail.textContent = connectionInfo.syncNote
      || (connectionInfo.livePredictionSynced
        ? `${connectionInfo.host} · 实时同步`
        : `${connectionInfo.host}${latency}`);
  } else {
    badge.classList.add('is-offline');
    dot.classList.add('offline');
    stateText.textContent = '未连通 · 本地快照';
    hostText.textContent = connectionInfo.host;
    heroStatus.textContent = '未连通 · 本地快照';
    heroDetail.textContent = connectionInfo.proxyOutdated
      ? '服务版本待重启更新'
      : `${connectionInfo.host} 暂不可达`;
  }
}

// 刷新顶部 Hero 展台统计
function renderHeroSummary() {
  const rawName = currentState.display_name || '2026 Las Vegas Grand Prix';
  const cnName = ROUND_CN_NAMES[rawName] || rawName;
  byId('gp-title').textContent = cnName;
  byId('gp-subtitle').textContent = 'Las Vegas Strip Circuit · 单圈 6.201 km · 正赛 50 圈';
  byId('hero-round-badge').textContent = `${currentState.season_year || 2026} 赛季 · 第 ${currentState.source_gameday_id || '21'} 站`;

  const totalQ = currentState.questions?.length ?? 10;
  const preds = Object.values(currentState.predictions ?? {});
  const predictedCount = preds.filter(p => p.status === 'PREDICTED').length;

  let baseSum = 0;
  let maxSum = 0;
  for (const q of currentState.questions ?? []) {
    const p = currentState.predictions?.[q.source_question_id];
    if (!p || p.status !== 'PREDICTED') continue;
    for (const pickKey of p.picks ?? []) {
      const opt = findOption(q, pickKey);
      const pts = Number(opt?.points ?? 0);
      baseSum += pts;
      maxSum += q.no === 1 ? pts * 2 : pts;
    }
  }

  byId('kpi-predicted').textContent = `${predictedCount} / ${totalQ} 题`;
  byId('kpi-points-sub').textContent = `组合 ${baseSum} 分 · 最高 ${maxSum} 分`;

  if (currentState.generated_at) {
    byId('updated').textContent = `更新于 ${formatTime(currentState.generated_at)}`;
  }

  byId('pred-model').textContent = modelName(currentState.model);
  byId('pred-round').textContent = currentState.run_id ? `第 ${currentState.run_id} 轮` : '当前轮次';
  byId('pred-round-sub').textContent = formatBatchTime(currentState.data_cutoff_at);
  byId('pred-generated').textContent = `${formatTime(currentState.generated_at)} 生成`;

  // 同步赛道卡片焦点（随预测轮次联动）
  const q1 = currentState.questions?.find(q => q.no === 1);
  const q6 = currentState.questions?.find(q => q.no === 6);
  const p1Key = currentState.predictions?.[q1?.source_question_id]?.picks?.[0];
  const pitKey = currentState.predictions?.[q6?.source_question_id]?.picks?.[0];
  const p1Opt = q1 && p1Key ? findOption(q1, p1Key) : null;
  const pitOpt = q6 && pitKey ? findOption(q6, pitKey) : null;
  if (byId('circuit-winner')) byId('circuit-winner').textContent = p1Opt ? getOptionShortName(p1Opt) : '—';
  if (byId('circuit-pit')) byId('circuit-pit').textContent = pitOpt ? getOptionShortName(pitOpt) : '—';

  renderConnectionStatus();
}

async function getJson(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function checkApiConnection() {
  connectionInfo.checking = true;
  renderConnectionStatus();
  try {
    const resp = await fetch('/local/connection', { signal: AbortSignal.timeout(3500) });
    if (resp.ok) {
      const data = await resp.json();
      connectionInfo.host = data.host || 'API 服务';
      connectionInfo.online = Boolean(data.online);
      connectionInfo.latencyMs = data.latencyMs ?? null;
      connectionInfo.proxyOutdated = false;
    } else if (resp.status === 404) {
      // 旧版代理进程尚未重启，提示重启以加载连接探针
      connectionInfo.proxyOutdated = true;
      connectionInfo.online = false;
      connectionInfo.latencyMs = null;
    } else {
      connectionInfo.online = false;
      connectionInfo.latencyMs = null;
    }
  } catch {
    connectionInfo.online = false;
    connectionInfo.latencyMs = null;
  }
  connectionInfo.checking = false;
  connectionInfo.checkedAt = new Date();
  renderConnectionStatus();
}

function applyRunToState(runId) {
  const run = PREDICTION_RUNS.get(String(runId));
  if (!run) return;
  currentState.run_id = run.run_id;
  currentState.request_id = run.request_id;
  currentState.model = run.model;
  currentState.data_cutoff_at = run.data_cutoff_at;
  currentState.generated_at = run.generated_at;
  currentState.predictions = structuredClone(run.predictions);
  syncRunSelectOptions(run.run_id);
  renderHeroSummary();
  renderQuestionsGrid();
  renderInsightsPanel();
}

async function loadRoundDetail() {
  const generation = ++detailGeneration;
  const selectedRoundId = roundSelect.value || '140';
  const nextState = structuredClone(VEGAS_ROUND_DATA);
  nextState.round_id = selectedRoundId;
  connectionInfo.livePredictionSynced = false;
  connectionInfo.syncNote = '';

  if (connectionInfo.proxyOutdated) {
    connectionInfo.syncNote = '服务版本待更新，暂展示本地快照';
  } else if (connectionInfo.online) {
    try {
      const defResp = await getJson(`/internal/v2/rounds/${encodeURIComponent(selectedRoundId)}/predictions/definition`);
      if (generation !== detailGeneration) return;
      if (defResp?.definition?.questions?.length === 10) {
        nextState.display_name = defResp.definition.name || nextState.display_name;
        const pointsLookup = new Map();
        for (const vq of VEGAS_ROUND_DATA.questions) {
          for (const vo of vq.options) {
            pointsLookup.set(`${vq.no}:${vo.source_id}`, vo.points);
          }
        }
        nextState.questions = defResp.definition.questions.map(q => ({
          question_id: q.question_id,
          source_question_id: q.source_question_id,
          no: q.no,
          text: q.text,
          rule: q.rule,
          options: q.options.map(o => ({
            ...o,
            points: o.points ?? pointsLookup.get(`${q.no}:${o.source_id}`) ?? '',
          })),
        }));
      }
    } catch {
      // 使用内置的第 21 站完整题目定义
    }

    // 按当前整点向前探测最新已完成的每小时预测轮次
    try {
      const now = new Date();
      now.setUTCMinutes(0, 0, 0);
      let latestHourNote = '';
      for (let offset = 0; offset < 6; offset++) {
        const hourDate = new Date(now.getTime() - offset * 3600_000);
        const reqId = await hourlyRequestId(selectedRoundId, hourDate);
        const hh = `${String(hourDate.getHours()).padStart(2, '0')}:00`;
        try {
          const predResp = await getJson(
            `/internal/v2/rounds/${encodeURIComponent(selectedRoundId)}/predictions/${reqId}`
          );
          if (generation !== detailGeneration) return;
          if (predResp?.prediction?.results?.length === 10) {
            connectionInfo.livePredictionSynced = true;
            const runId = String(predResp.run_id || '111');
            const map = {};
            for (const r of predResp.prediction.results) {
              map[r.source_question_id] = r;
            }
            PREDICTION_RUNS.set(runId, {
              run_id: runId,
              request_id: reqId,
              model: predResp.prediction.model,
              data_cutoff_at: predResp.prediction.data_cutoff_at,
              generated_at: predResp.prediction.generated_at,
              predictions: map,
            });
            nextState.run_id = runId;
            nextState.request_id = reqId;
            nextState.model = predResp.prediction.model;
            nextState.data_cutoff_at = predResp.prediction.data_cutoff_at;
            nextState.generated_at = predResp.prediction.generated_at;
            nextState.predictions = map;
            if (latestHourNote) {
              connectionInfo.syncNote = `${latestHourNote}，当前展示第 ${runId} 轮`;
            }
            break;
          }
          if (offset === 0 && predResp?.status) {
            const stMap = { QUEUED: '推演中 (QUEUED)', FAILED: '执行失败 (FAILED)', EXPIRED: '已过期 (EXPIRED)' };
            latestHourNote = `${hh} 轮${stMap[predResp.status] ?? predResp.status}`;
          }
        } catch (err) {
          if (err?.status === 503) {
            connectionInfo.syncNote = '未配置服务访问令牌';
            break;
          }
          if (err?.status === 401) {
            connectionInfo.syncNote = '服务访问令牌校验未通过';
            break;
          }
          if (offset === 0 && err?.status === 404) {
            latestHourNote = `${hh} 轮尚未创建`;
          }
        }
      }
      if (!connectionInfo.livePredictionSynced && !connectionInfo.syncNote) {
        connectionInfo.syncNote = latestHourNote || '近 6 小时无新增预测，展示本地快照';
      }
    } catch {
      // 使用内置的第 21 站最新 AI 预测结果
    }
  }

  currentState = nextState;
  syncRunSelectOptions(currentState.run_id);
  renderHeroSummary();
  renderQuestionsGrid();
  renderInsightsPanel();
}

async function loadRounds() {
  refreshBtn.disabled = true;
  await checkApiConnection();
  if (connectionInfo.online && !connectionInfo.proxyOutdated) {
    try {
      const data = await getJson('/api/v1/rounds?page=0&size=20');
      const previous = roundSelect.value;
      roundSelect.replaceChildren();
      for (const item of data.items) {
        const cn = ROUND_CN_NAMES[item.display_name] || item.display_name;
        roundSelect.add(new Option(cn, item.round_id));
      }
      if (!data.items.length) {
        roundSelect.add(new Option('第 21 站 · 拉斯维加斯大奖赛', '140'));
      }
      if ([...roundSelect.options].some(o => o.value === previous)) {
        roundSelect.value = previous;
      }
    } catch {
      roundSelect.replaceChildren(new Option('第 21 站 · 拉斯维加斯大奖赛', '140'));
    }
  } else {
    roundSelect.replaceChildren(new Option('第 21 站 · 拉斯维加斯大奖赛', '140'));
  }

  await loadRoundDetail();
  refreshBtn.disabled = false;
}

refreshBtn.addEventListener('click', () => void loadRounds());
roundSelect.addEventListener('change', () => void loadRoundDetail());
predRunSelect.addEventListener('change', () => applyRunToState(predRunSelect.value));
searchInput.addEventListener('input', () => renderQuestionsGrid());

for (const pill of document.querySelectorAll('.filter-pill')) {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter || 'ALL';
    renderQuestionsGrid();
  });
}

// 初始化渲染
syncRunSelectOptions(currentState.run_id);
renderHeroSummary();
renderQuestionsGrid();
renderInsightsPanel();
void loadRounds();
