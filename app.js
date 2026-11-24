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

// 分站展示信息；未登记的分站仅显示后端名称并隐藏赛道示意图
const ROUND_META = {
  '2026 Las Vegas Grand Prix': {
    cnName: '2026 拉斯维加斯大奖赛',
    season: '2026',
    gameday: '21',
    subtitle: 'Las Vegas Strip Circuit · 单圈 6.201 km · 正赛 50 圈',
    circuit: {
      tag: 'LAS VEGAS STRIP',
      info: '17 弯角 · 3 段直道',
      path: 'M 78 140 L 286 140 C 312 140 326 124 322 100 L 312 52 C 306 32 282 26 264 38 L 242 58 C 228 70 212 66 206 48 C 198 28 172 24 156 40 C 142 54 144 76 132 86 L 64 86 C 42 86 34 106 42 124 C 48 136 60 140 78 140 Z',
      start: { x: 150, y: 140 },
    },
  },
  '2026 Qatar Grand Prix': {
    cnName: '2026 卡塔尔大奖赛',
    season: '2026',
    gameday: '22',
    subtitle: 'Lusail International Circuit · 单圈 5.419 km · 正赛 57 圈',
    // 卢赛尔赛道手绘示意，非官方测绘
    circuit: {
      tag: 'LUSAIL INTERNATIONAL',
      info: '16 弯角 · 1 公里主直道',
      path: 'M 60 150 L 290 150 C 315 150 325 135 318 118 L 300 92 C 292 80 300 66 314 62 C 330 58 334 40 320 32 L 250 30 C 232 30 226 44 236 56 L 250 72 C 258 84 248 96 234 94 L 170 84 C 150 80 140 60 122 56 L 80 50 C 56 46 40 62 46 84 L 52 110 C 56 124 44 132 40 140 C 36 148 46 150 60 150 Z',
      start: { x: 150, y: 150 },
    },
  },
};

const ROUND_POLL_MS = 5 * 60 * 1000;
// 用户手动选择了非最新分站时不自动切换
let roundPinned = false;

// 模型标识转为展示名称；未登记的标识原样展示
const MODEL_NAMES = {
  'deepseek-flash': 'DeepSeek Flash',
};
const modelName = id => MODEL_NAMES[id] ?? id ?? '—';

// 预测轮次使用实际截止时间，支持非整点的手动批次。
function formatBatchTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 批次`;
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

// 各题号题型固定，具体题面每站不同，标题直接使用官方原文
const QUESTION_META = {
  1: { category: '领奖台前三', group: 'PODIUM' },
  2: { category: '排位赛杆位', group: 'QUALIFYING' },
  3: { category: '排位赛对比', group: 'QUALIFYING' },
  4: { category: '排位赛晋级深度', group: 'QUALIFYING' },
  5: { category: '正赛最快单圈', group: 'RACE' },
  6: { category: '最快进站车队', group: 'RACE' },
  7: { category: '正赛名次对决', group: 'RACE' },
  8: { category: '正赛完赛人数', group: 'RACE' },
  9: { category: '车手完赛区间', group: 'RACE' },
  10: { category: '正赛特别题', group: 'RACE' },
};

function questionMeta(q) {
  const base = QUESTION_META[q.no] ?? { category: `Q${q.no}`, group: 'RACE' };
  const picks = q.rule?.max_picks ?? 1;
  const ruleDesc = q.rule?.ordered
    ? `按名次选 ${picks} 人 · 全中翻倍 ×2`
    : picks > 1 ? `选 ${picks} 项` : (q.options.length > 4 ? '单选 1 项' : `${q.options.length} 选一`);
  return { ...base, cnTitle: q.text, ruleDesc };
}

// 第 21 站各题候选分值静态索引（后端 AnswerDefinition 不含分值，仅作 UI 展示补充）
const DRIVER_POINTS = {
  '131': { 1: '5', 2: '10', 5: '10' },
  '11161': { 1: '8', 2: '12', 5: '12' },
  '124': { 1: '10', 2: '15', 5: '12' },
  '115': { 1: '12', 2: '15', 5: '15' },
  '110': { 1: '14', 2: '16', 5: '15' },
  '117': { 1: '15', 2: '18', 5: '18' },
  '1982': { 1: '18', 2: '20', 5: '20' },
  '11032': { 1: '20', 2: '30', 5: '30' },
  '114': { 1: '30', 2: '35', 5: '35' },
  '18': { 1: '35', 2: '40', 5: '40' },
  '11149': { 1: '35', 2: '40', 5: '40' },
  '11059': { 1: '40', 2: '40', 5: '40' },
  '11051': { 1: '40', 2: '40', 5: '40' },
  '111': { 1: '40', 2: '45', 5: '45' },
  '11031': { 1: '45', 2: '50', 5: '50' },
  '125': { 1: '50', 2: '50', 5: '50' },
  '11': { 1: '50', 2: '50', 5: '50' },
  '12': { 1: '50', 2: '55', 5: '55' },
  '11205': { 1: '55', 2: '55', 5: '55' },
  '129': { 1: '55', 2: '58', 5: '58' },
  '121': { 1: '60', 2: '58', 5: '60' },
  '13': { 1: '60', 2: '60', 5: '60' },
};

const STATIC_QUESTION_POINTS = {
  3: { '11161': '10', '124': '15' },
  4: { '1': '20', '2': '10', '3': '15' },
  6: { '29': '10', '28': '12', '2636': '15', '25': '20', '27': '25', '2640': '28', '24': '30', '210': '35', '23': '40', '2641': '45', '26': '50' },
  7: { '18': '10', '111': '15', '11031': '20', '129': '30' },
  8: { '1': '30', '2': '25', '3': '20', '4': '15', '5': '10', '6': '15', '7': '20' },
  9: { '1': '40', '2': '20', '3': '10', '4': '15' },
  10: { '1': '10', '2': '15', '3': '20', '4': '30' },
};

function lookupOptionPoints(roundId, qNo, sourceId) {
  if (String(roundId) !== '140') return '';
  return DRIVER_POINTS[sourceId]?.[qNo] ?? STATIC_QUESTION_POINTS[qNo]?.[sourceId] ?? '';
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

function createEmptyState(roundId = '') {
  return {
    round_id: roundId,
    run_id: '',
    request_id: '',
    display_name: '',
    model: '',
    data_cutoff_at: '',
    generated_at: '',
    deadline_at: '',
    locked: false,
    final_run_id: '',
    questions: [],
    predictions: {},
    loading: false,
    errorMessage: '',
  };
}

// 后端实时拉取到的预测轮次记录（每次刷新清空重拉，不保留本地快照）
const PREDICTION_RUNS = new Map();

const refreshBtn = byId('refresh');
const roundSelect = byId('round');
const predRunSelect = byId('pred-run-select');
const searchInput = byId('question-search');
let detailGeneration = 0;
let activeFilter = 'ALL';
let expandedQuestions = new Set();
let currentState = createEmptyState();
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

  const filterAllows = activeFilter === 'ALL' || activeFilter === 'PODIUM';
  const searchMatches = question && questionMatchesSearch(question, questionMeta(question), pred, keyword);

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
    const ptsText = opt?.points
      ? `${opt.points} 分 · 全中 ${Number(opt.points) * 2} 分`
      : (currentState.loading && !currentState.run_id ? '拉取中' : '待定');
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
    } else if (currentState.loading && !currentState.run_id) {
      info.append(
        el('div', 'podium-driver-name', '正在拉取预测…'),
        el('div', 'podium-driver-team', '请稍候')
      );
    } else {
      info.append(
        el('div', 'podium-driver-name', '暂未推荐'),
        el('div', 'podium-driver-team', currentState.locked ? '截止时依据不足，结果不再更新' : '等待更多数据')
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

    const qMeta = questionMeta(q);
    const pendingLoad = currentState.loading && !currentState.run_id;
    const pred = currentState.predictions?.[q.source_question_id] ?? {
      status: 'DATA_INSUFFICIENT',
      picks: [],
      explanation: pendingLoad ? '正在从后端检索最新预测批次…' : '当前暂无该题的赛前预测建议。',
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

    if (pendingLoad) {
      pickMain.append(
        el('span', 'pick-badge', '同步中'),
        el('span', 'pick-sub', '正在拉取最新轮次')
      );
      pickRow.append(pickMain);
    } else if (isInsufficient || !pred.picks?.length) {
      pickMain.append(
        el('span', 'pick-badge', currentState.locked ? '已锁定 · 依据不足' : '暂缓推荐'),
        el('span', 'pick-sub', currentState.locked ? '截止后不再补入答案' : '待自由练习赛数据补充')
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
    let emptyMsg = '未找到匹配的赛题或车手，请尝试其他关键词。';
    if (!questions.length) {
      emptyMsg = currentState.loading
        ? '正在从后端实时加载赛题与预测数据…'
        : (currentState.errorMessage || '暂无后端赛题数据，请点击右上角“刷新”重试。');
    }
    container.append(el('p', 'section-note', emptyMsg));
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
  if (!sorted.length) {
    predRunSelect.add(new Option(currentState.locked ? '锁定为空 · 无截止前结果'
      : (currentState.loading ? '正在拉取预测轮次…' : '暂无可用轮次'), ''));
    return;
  }
  if (currentState.locked && !currentState.final_run_id) {
    predRunSelect.add(new Option('锁定为空 · 无截止前结果', ''));
  }
  sorted.forEach((run, idx) => {
    const timeShort = formatBatchTime(run.data_cutoff_at).replace(' 批次', '');
    const suffix = currentState.locked
      ? (run.run_id === currentState.final_run_id ? ' (锁定答案)' : ' (历史)')
      : (idx === 0 ? ' (最新)' : '');
    const labelText = `第 ${run.run_id} 轮 · ${timeShort}${suffix}`;
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
    heroStatus.textContent = connectionInfo.livePredictionSynced
      ? '服务已连接'
      : (currentState.loading ? '正在同步…' : '服务已连接（无预测）');
    heroDetail.textContent = connectionInfo.syncNote
      || (connectionInfo.livePredictionSynced
        ? `${connectionInfo.host} · 实时同步`
        : `${connectionInfo.host}${latency}`);
  } else {
    badge.classList.add('is-offline');
    dot.classList.add('offline');
    stateText.textContent = '未连通';
    hostText.textContent = connectionInfo.host;
    heroStatus.textContent = '未连通';
    heroDetail.textContent = connectionInfo.proxyOutdated
      ? '服务版本待重启更新'
      : `${connectionInfo.host} 暂不可达`;
  }
}

// 按分站切换赛道卡片；未登记的分站隐藏示意图
function renderCircuit(meta, rawName) {
  const circuit = meta?.circuit;
  byId('circuit-tag').textContent = circuit?.tag || rawName.toUpperCase() || '—';
  byId('circuit-info').textContent = circuit?.info || '';
  byId('circuit-svg-wrap').style.display = circuit ? '' : 'none';
  if (!circuit) return;
  byId('circuit-svg').setAttribute('aria-label', circuit.tag);
  byId('circuit-path-base').setAttribute('d', circuit.path);
  byId('circuit-path-glow').setAttribute('d', circuit.path);
  const line = byId('circuit-start-line');
  line.setAttribute('x1', circuit.start.x);
  line.setAttribute('x2', circuit.start.x);
  line.setAttribute('y1', circuit.start.y - 8);
  line.setAttribute('y2', circuit.start.y + 8);
  const label = byId('circuit-start-label');
  label.setAttribute('x', circuit.start.x + 8);
  label.setAttribute('y', circuit.start.y + 20);
}

// 刷新顶部 Hero 展台统计
function renderHeroSummary() {
  const rawName = currentState.display_name || '';
  const meta = ROUND_META[rawName];
  byId('gp-title').textContent = meta?.cnName || rawName || (currentState.loading ? '正在连接后端…' : '暂无赛站数据');
  byId('gp-subtitle').textContent = meta?.subtitle
    || (currentState.errorMessage || (currentState.loading ? '正在从后端实时获取赛题与预测批次' : '实时后端数据'));
  byId('hero-round-badge').textContent = meta
    ? `${meta.season} 赛季 · 第 ${meta.gameday} 站`
    : (currentState.round_id ? `Round ${currentState.round_id}` : '实时赛站');
  byId('podium-heading').textContent = `第 1 题 · ${meta?.cnName || rawName || ''}领奖台前三`;
  renderCircuit(meta, rawName);
  byId('hero-track-badge').textContent = currentState.locked
    ? '已截止 · 答案已锁定'
    : (currentState.deadline_at ? `截止 ${formatTime(currentState.deadline_at)}` : '截止时间待核实');

  const totalQ = currentState.questions?.length ?? 0;
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

  byId('kpi-predicted').textContent = totalQ ? `${predictedCount} / ${totalQ} 题` : '—';
  if (!totalQ) {
    byId('kpi-points-sub').textContent = currentState.errorMessage || (currentState.loading ? '同步中…' : '暂无数据');
  } else if (!currentState.run_id) {
    byId('kpi-points-sub').textContent = currentState.locked ? '截止前没有已完成预测'
      : (currentState.loading ? '正在查询近 48 小时轮次…' : '近 48 小时暂无预测');
  } else {
    byId('kpi-points-sub').textContent = baseSum > 0 ? `组合 ${baseSum} 分 · 最高 ${maxSum} 分` : '已同步后端预测';
  }

  byId('updated').textContent = currentState.generated_at ? `更新于 ${formatTime(currentState.generated_at)}` : '';
  byId('pred-model').textContent = modelName(currentState.model);
  byId('pred-round').textContent = currentState.run_id
    ? `第 ${currentState.run_id} 轮`
    : (currentState.loading ? '拉取中…' : '暂无轮次');
  byId('pred-round-sub').textContent = currentState.locked
    ? (currentState.final_run_id ? `最终答案：第 ${currentState.final_run_id} 轮 · 截止 ${formatTime(currentState.deadline_at)}` : '已锁定为空，后续结果不会补入')
    : (currentState.data_cutoff_at ? formatBatchTime(currentState.data_cutoff_at)
      : (currentState.loading ? '正在检索后端批次' : '近 48 小时无记录'));
  byId('pred-generated').textContent = currentState.generated_at ? `${formatTime(currentState.generated_at)} 生成` : '—';

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
  const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
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
    const resp = await fetch('/local/connection', { cache: 'no-store', signal: AbortSignal.timeout(3500) });
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
  if (!runId && currentState.locked && !currentState.final_run_id) {
    Object.assign(currentState, { run_id: '', request_id: '', model: '', data_cutoff_at: '', generated_at: '', predictions: {} });
    connectionInfo.livePredictionSynced = false;
    connectionInfo.syncNote = '已截止，锁定时没有已完成预测';
    syncRunSelectOptions('');
    renderHeroSummary();
    renderQuestionsGrid();
    renderInsightsPanel();
    return;
  }
  const run = PREDICTION_RUNS.get(String(runId));
  if (!run) return;
  connectionInfo.livePredictionSynced = true;
  currentState.run_id = run.run_id;
  currentState.request_id = run.request_id;
  currentState.model = run.model;
  currentState.data_cutoff_at = run.data_cutoff_at;
  currentState.generated_at = run.generated_at;
  currentState.predictions = structuredClone(run.predictions);
  connectionInfo.syncNote = currentState.locked
    ? (run.run_id === currentState.final_run_id ? `当前展示锁定答案 · 第 ${run.run_id} 轮` : `查看历史第 ${run.run_id} 轮，锁定答案不变`)
    : `当前展示第 ${run.run_id} 轮`;
  syncRunSelectOptions(run.run_id);
  renderHeroSummary();
  renderQuestionsGrid();
  renderInsightsPanel();
}

async function loadRoundDetail() {
  const generation = ++detailGeneration;
  PREDICTION_RUNS.clear();

  const selectedRoundId = roundSelect.value || '';
  const nextState = createEmptyState(selectedRoundId);
  const selectedOptText = roundSelect.selectedOptions?.[0]?.textContent || '';
  if (selectedRoundId) nextState.display_name = selectedOptText;
  connectionInfo.livePredictionSynced = false;
  connectionInfo.syncNote = '';

  if (connectionInfo.proxyOutdated) {
    nextState.errorMessage = '服务版本待更新，请重建后重试。';
    connectionInfo.syncNote = '服务版本待更新';
    currentState = nextState;
    syncRunSelectOptions('');
    renderHeroSummary();
    renderQuestionsGrid();
    renderInsightsPanel();
    return;
  }

  if (!connectionInfo.online || !selectedRoundId) {
    nextState.errorMessage = connectionInfo.online ? '暂无可用赛站。' : '后端 API 暂不可达，请稍后刷新重试。';
    currentState = nextState;
    syncRunSelectOptions('');
    renderHeroSummary();
    renderQuestionsGrid();
    renderInsightsPanel();
    return;
  }

  nextState.loading = true;
  currentState = nextState;
  syncRunSelectOptions('');
  renderHeroSummary();
  renderQuestionsGrid();

  let frozen;
  try {
    frozen = await getJson(`/internal/v2/rounds/${encodeURIComponent(selectedRoundId)}/predictions/final`);
    const defResp = frozen.locked
      ? { definition: frozen.snapshot.definition }
      : await getJson(`/internal/v2/rounds/${encodeURIComponent(selectedRoundId)}/predictions/definition`);
    if (generation !== detailGeneration) return;
    if (!defResp?.definition?.questions?.length) {
      throw new Error('EMPTY_DEFINITION');
    }
    nextState.display_name = defResp.definition.name || nextState.display_name;
    nextState.deadline_at = frozen.deadline_at || '';
    nextState.locked = frozen.locked;
    nextState.final_run_id = frozen.snapshot?.run_id || '';
    nextState.questions = defResp.definition.questions.map(q => ({
      question_id: q.question_id,
      source_question_id: q.source_question_id,
      no: q.no,
      text: q.text,
      rule: q.rule,
      options: q.options.map(o => ({
        ...o,
        points: o.points ?? lookupOptionPoints(selectedRoundId, q.no, o.source_id),
      })),
    }));
    currentState = nextState;
    renderHeroSummary();
    renderQuestionsGrid();
  } catch (err) {
    if (generation !== detailGeneration) return;
    nextState.loading = false;
    nextState.errorMessage = err?.status === 401
      ? '服务访问令牌校验未通过，无法加载赛题。'
      : err?.status === 503
        ? '未配置服务访问令牌，无法加载赛题。'
        : '后端赛题定义请求失败，请点击刷新重试。';
    connectionInfo.syncNote = nextState.errorMessage;
    currentState = nextState;
    syncRunSelectOptions('');
    renderHeroSummary();
    renderQuestionsGrid();
    renderInsightsPanel();
    return;
  }

  // 读取实际创建的轮次，同时支持定时与手动预测。
  try {
    const runs = await getJson(
      `/internal/v2/rounds/${encodeURIComponent(selectedRoundId)}/predictions`
    );
    if (generation !== detailGeneration) return;
    const candidates = frozen.snapshot?.prediction
      ? [...runs, { run_id: frozen.snapshot.run_id, prediction: frozen.snapshot.prediction }]
      : runs;
    for (const run of candidates) {
      if (run.prediction?.results?.length !== 10) continue;
      const prediction = run.prediction;
      PREDICTION_RUNS.set(String(run.run_id), {
        run_id: String(run.run_id),
        request_id: prediction.request_id,
        model: prediction.model,
        data_cutoff_at: prediction.data_cutoff_at,
        generated_at: prediction.generated_at,
        predictions: Object.fromEntries(prediction.results.map(item => [item.source_question_id, item])),
      });
    }
    const latest = nextState.locked
      ? PREDICTION_RUNS.get(nextState.final_run_id)
      : PREDICTION_RUNS.values().next().value;
    if (latest) {
      Object.assign(nextState, latest);
      connectionInfo.livePredictionSynced = true;
      connectionInfo.syncNote = nextState.locked ? `当前展示锁定答案 · 第 ${latest.run_id} 轮` : `当前展示第 ${latest.run_id} 轮`;
    } else {
      const statusLabels = { QUEUED: '预测处理中', FAILED: '预测执行失败', EXPIRED: '预测已过期' };
      connectionInfo.syncNote = nextState.locked ? '已截止，锁定时没有已完成预测' : runs.length
        ? (statusLabels[runs[0].status] || '暂无已完成预测')
        : '近 48 小时暂无预测记录';
    }
    nextState.loading = false;
  } catch (error) {
    if (generation !== detailGeneration) return;
    nextState.loading = false;
    connectionInfo.syncNote = error?.status === 401
      ? '服务访问令牌校验未通过'
      : error?.status === 503 ? '未配置服务访问令牌' : '预测批次请求失败，请刷新重试';
    nextState.errorMessage = connectionInfo.syncNote;
  }

  currentState = nextState;
  syncRunSelectOptions(currentState.run_id);
  renderHeroSummary();
  renderQuestionsGrid();
  renderInsightsPanel();
}

async function loadRounds() {
  refreshBtn.disabled = true;
  const previous = roundSelect.value;
  await checkApiConnection();
  roundSelect.replaceChildren();
  if (connectionInfo.online && !connectionInfo.proxyOutdated) {
    try {
      const data = await getJson('/api/v1/rounds?page=0&size=20');
      for (const item of data.items) {
        const cn = ROUND_META[item.display_name]?.cnName || item.display_name;
        roundSelect.add(new Option(cn, item.round_id));
      }
      if (!data.items.length) {
        roundSelect.add(new Option('暂无赛站', ''));
      } else if (roundPinned && [...roundSelect.options].some(o => o.value === previous)) {
        roundSelect.value = previous;
      } else {
        // 默认展示列表第一项，即后端按 id 倒序返回的最新分站
        roundPinned = false;
      }
    } catch {
      roundSelect.add(new Option('赛站加载失败', ''));
    }
  } else {
    roundSelect.add(new Option('后端未连接', ''));
  }

  await loadRoundDetail();
  refreshBtn.disabled = false;
}

refreshBtn.addEventListener('click', () => void loadRounds());
roundSelect.addEventListener('change', () => {
  // 选回最新分站即恢复自动切换
  roundPinned = roundSelect.selectedIndex !== 0;
  void loadRoundDetail();
});

// 定时检查是否出现新分站，仅在列表首项变化时重新加载，避免打断当前浏览
async function pollRounds() {
  if (roundPinned || refreshBtn.disabled) return;
  const data = await getJson('/api/v1/rounds?page=0&size=1');
  const newest = data.items[0]?.round_id;
  if (newest && newest !== roundSelect.options[0]?.value) await loadRounds();
}
setInterval(() => void pollRounds(), ROUND_POLL_MS);
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

// 初始化直接请求后端
syncRunSelectOptions('');
renderHeroSummary();
renderQuestionsGrid();
renderInsightsPanel();
void loadRounds();
