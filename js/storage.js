/*
  Camada de dados.

  Se SUPABASE_URL/SUPABASE_ANON_KEY (em js/supabase-config.js) estiverem
  preenchidos, os dados são salvos no Supabase e sincronizados em tempo
  real entre todos os dispositivos conectados. Se não estiverem
  preenchidos, o app cai automaticamente para o armazenamento local do
  navegador (localStorage), como antes — funciona em um dispositivo só.

  Todo o resto do app (app.js, painel.js) continua chamando
  Store.getX()/Store.setX(arrayCompleto), sem precisar saber qual dos dois
  modos está ativo.
*/

const IS_CONFIGURED = typeof SUPABASE_URL === 'string' && typeof SUPABASE_ANON_KEY === 'string' &&
  !SUPABASE_URL.includes('COLE_AQUI') && !SUPABASE_ANON_KEY.includes('COLE_AQUI') &&
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

const supabaseClient = IS_CONFIGURED ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const LOCAL_KEYS = {
  cenarios: 'circuito:cenarios',
  alunos: 'circuito:alunos',
  agendamentos: 'circuito:agendamentos',
  atribuicoesAtivas: 'circuito:atribuicoesAtivas',
  historico: 'circuito:historico'
};

const TABLES = {
  cenarios: 'cenarios',
  alunos: 'alunos',
  agendamentos: 'agendamentos',
  atribuicoesAtivas: 'atribuicoes_ativas',
  historico: 'historico'
};

const MAPPERS = {
  cenarios: {
    toRow: (o) => ({ id: o.id, nome: o.nome, duracao_min: o.duracaoMin }),
    fromRow: (r) => ({ id: r.id, nome: r.nome, duracaoMin: r.duracao_min })
  },
  alunos: {
    toRow: (o) => ({
      id: o.id, nome: o.nome, curso: o.curso || '',
      faculdade: o.faculdade || '', periodo: o.periodo || '', contrato: o.contrato || '',
      telefone: o.telefone || '', horario: o.horario || '', convidados: o.convidados || '',
      pet: o.pet || '', confirmado: o.confirmado || '', observacao: o.observacao || ''
    }),
    fromRow: (r) => ({
      id: r.id, nome: r.nome, curso: r.curso,
      faculdade: r.faculdade, periodo: r.periodo, contrato: r.contrato,
      telefone: r.telefone, horario: r.horario, convidados: r.convidados,
      pet: r.pet, confirmado: r.confirmado, observacao: r.observacao
    })
  },
  agendamentos: {
    toRow: (o) => ({ id: o.id, aluno_id: o.alunoId, cenario_inicial_id: o.cenarioInicialId, horario: o.horario, chegou: !!o.chegou, hora_chegada: o.horaChegada || null, status: o.status || 'aguardando' }),
    fromRow: (r) => ({ id: r.id, alunoId: r.aluno_id, cenarioInicialId: r.cenario_inicial_id, horario: r.horario, chegou: r.chegou, horaChegada: r.hora_chegada, status: r.status || 'aguardando' })
  },
  atribuicoesAtivas: {
    toRow: (o) => ({ id: o.id, aluno_id: o.alunoId, cenario_atual_id: o.cenarioAtualId, visitados: o.visitados || [], inicio_posicao_atual: o.inicioPosicaoAtual }),
    fromRow: (r) => ({ id: r.id, alunoId: r.aluno_id, cenarioAtualId: r.cenario_atual_id, visitados: r.visitados || [], inicioPosicaoAtual: r.inicio_posicao_atual })
  },
  historico: {
    toRow: (o) => ({ id: o.id, aluno_nome: o.alunoNome, cenario_nome: o.cenarioNome, duracao_prevista_min: o.duracaoPrevistaMin, duracao_real_min: o.duracaoRealMin, quando: o.quando }),
    fromRow: (r) => ({ id: r.id, alunoNome: r.aluno_nome, cenarioNome: r.cenario_nome, duracaoPrevistaMin: r.duracao_prevista_min, duracaoRealMin: r.duracao_real_min, quando: r.quando })
  }
};

const cache = { cenarios: [], alunos: [], agendamentos: [], atribuicoesAtivas: [], historico: [] };
let onChangeCallback = null;
let connectionStatus = IS_CONFIGURED ? 'conectando' : 'local';

function notify() {
  if (onChangeCallback) {
    try { onChangeCallback(); } catch (err) { console.error(err); }
  }
}

function dbGetLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function dbSetLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* armazenamento indisponível */ }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cloneList(arr) {
  return arr.map((item) => ({ ...item }));
}

async function fetchTable(key) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from(TABLES[key]).select('*');
  if (error) {
    console.error('Erro ao buscar', key, error);
    connectionStatus = 'erro';
    notify();
    return;
  }
  cache[key] = data.map(MAPPERS[key].fromRow);
  connectionStatus = 'conectado';
  notify();
}

async function syncTable(key, newArray) {
  const oldArray = cache[key];
  cache[key] = newArray;
  notify();

  if (!supabaseClient) {
    dbSetLocal(LOCAL_KEYS[key], newArray);
    return;
  }

  const newIds = new Set(newArray.map((r) => r.id));
  const toDeleteIds = oldArray.filter((r) => !newIds.has(r.id)).map((r) => r.id);

  try {
    if (toDeleteIds.length) {
      await supabaseClient.from(TABLES[key]).delete().in('id', toDeleteIds);
    }
    if (newArray.length) {
      await supabaseClient.from(TABLES[key]).upsert(newArray.map(MAPPERS[key].toRow));
    }
    connectionStatus = 'conectado';
  } catch (err) {
    console.error('Erro ao salvar', key, err);
    connectionStatus = 'erro';
  }
  notify();
}

function initSupabase() {
  Object.keys(TABLES).forEach((key) => fetchTable(key));

  const channel = supabaseClient.channel('circuito-changes');
  Object.keys(TABLES).forEach((key) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: TABLES[key] }, () => fetchTable(key));
  });
  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      connectionStatus = 'erro';
      notify();
    }
  });
}

function initLocal() {
  Object.keys(LOCAL_KEYS).forEach((key) => {
    cache[key] = dbGetLocal(LOCAL_KEYS[key], []);
  });
}

if (IS_CONFIGURED) {
  initSupabase();
} else {
  initLocal();
}

const Store = {
  getCenarios: () => cloneList(cache.cenarios),
  setCenarios: (v) => syncTable('cenarios', v),

  getAlunos: () => cloneList(cache.alunos),
  setAlunos: (v) => syncTable('alunos', v),

  getAgendamentos: () => cloneList(cache.agendamentos),
  setAgendamentos: (v) => syncTable('agendamentos', v),

  getAtribuicoesAtivas: () => cloneList(cache.atribuicoesAtivas),
  setAtribuicoesAtivas: (v) => syncTable('atribuicoesAtivas', v),

  getHistorico: () => cloneList(cache.historico),
  setHistorico: (v) => syncTable('historico', v),

  getConnectionStatus: () => connectionStatus,
  isRealtime: () => IS_CONFIGURED,
  onChange: (cb) => { onChangeCallback = cb; },
  refreshAll: () => Promise.all(Object.keys(TABLES).map((key) => fetchTable(key))),

  uid
};
