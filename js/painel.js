// Painel público — somente visualização, sem nenhuma ação de edição.

const RING_R = 34;
const RING_CIRC = 2 * Math.PI * RING_R;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tickClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderSyncStatus() {
  const el = document.getElementById('sync-status');
  if (!el) return;
  const status = Store.getConnectionStatus();
  const labels = {
    local: 'Somente neste dispositivo',
    conectando: 'Conectando…',
    conectado: 'Sincronizado em tempo real',
    erro: 'Erro de conexão'
  };
  el.textContent = labels[status] || status;
  el.className = 'sync-status ' + status;
}

function statusFromRestante(segundosRestantes, duracaoTotalSeg) {
  if (segundosRestantes < 0) return 'late';
  if (segundosRestantes <= duracaoTotalSeg * 0.15) return 'warn';
  return 'ok';
}

function formatTempo(segundos) {
  const negativo = segundos < 0;
  const abs = Math.abs(Math.round(segundos));
  const min = Math.floor(abs / 60).toString().padStart(2, '0');
  const seg = (abs % 60).toString().padStart(2, '0');
  return (negativo ? '+' : '') + min + ':' + seg;
}

function minutosAteHorario(horario) {
  if (!horario) return 0;
  const [h, m] = horario.split(':').map(Number);
  const alvo = new Date();
  alvo.setHours(h, m, 0, 0);
  return Math.round((alvo.getTime() - Date.now()) / 60000);
}

function formatContagem(diffMin) {
  if (diffMin <= 0) return diffMin === 0 ? 'agora' : `atrasado ${Math.abs(diffMin)} min`;
  if (diffMin < 60) return `em ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `em ${h}h${m.toString().padStart(2, '0')}`;
}

function renderPainelQueue() {
  const el = document.getElementById('painel-queue');
  const { agendamentos, alunos, cenarios } = getDadosPainel();
  const alunoPorId = Object.fromEntries(alunos.map((a) => [a.id, a]));
  const cenarioPorId = Object.fromEntries(cenarios.map((c) => [c.id, c]));

  const presentes = agendamentos
    .filter((ag) => ag.chegou && (ag.status || 'aguardando') === 'aguardando')
    .slice()
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  if (presentes.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum aluno aguardando no momento.</div>';
    return;
  }

  const cards = presentes.map((ag) => {
    const aluno = alunoPorId[ag.alunoId];
    const cenario = cenarioPorId[ag.cenarioInicialId];
    const diffMin = minutosAteHorario(ag.horario);
    return `
    <div class="queue-card painel-queue-card ${diffMin < 0 ? 'atrasado' : ''}">
      <div class="nome">${escapeHtml(aluno ? aluno.nome : 'Aluno removido')}</div>
      <div class="info">${ag.horario} · ${cenario ? escapeHtml(cenario.nome) : 'cenário não definido'}</div>
      <span class="badge ok">Aguardando</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="queue-row">${cards}</div>`;
}

function renderPainelCircuito() {
  const ativas = getDadosPainel().atribuicoes;
  const cenarios = getDadosPainel().cenarios;
  const alunos = getDadosPainel().alunos;
  const el = document.getElementById('painel-circuito');

  if (ativas.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum aluno em circuito agora.</div>';
    return;
  }

  const cenarioPorId = Object.fromEntries(cenarios.map((c) => [c.id, c]));
  const alunoPorId = Object.fromEntries(alunos.map((a) => [a.id, a]));

  const cards = ativas.map((a) => {
    const aluno = alunoPorId[a.alunoId];
    const cenarioAtual = cenarioPorId[a.cenarioAtualId];
    const nomeAluno = aluno ? aluno.nome : 'Aluno removido';
    if (!cenarioAtual) {
      return `
      <div class="card aluno-card">
        <p class="nome" style="font-weight:600;margin:0 0 4px;">${escapeHtml(nomeAluno)}</p>
        <p class="estimate" style="color:var(--danger);margin:0;">Cenário não encontrado — ajuste pela Agenda no painel de controle.</p>
      </div>`;
    }

    const visitados = a.visitados || [a.cenarioAtualId];
    const duracaoSeg = cenarioAtual.duracaoMin * 60;
    const passadoSeg = (Date.now() - a.inicioPosicaoAtual) / 1000;
    const restanteSeg = duracaoSeg - passadoSeg;
    const status = statusFromRestante(restanteSeg, duracaoSeg);
    const pctRestante = Math.min(Math.max(restanteSeg / duracaoSeg, 0), 1);
    const dashoffset = RING_CIRC * (1 - pctRestante);

    const naoVisitados = cenarios.filter((c) => c.id !== a.cenarioAtualId && !visitados.includes(c.id));
    const estimativaMin = naoVisitados.reduce((sum, c) => sum + c.duracaoMin, 0);

    return `
    <div class="card aluno-card status-${status}">
      <div class="ring-row">
        <div class="ring">
          <svg viewBox="0 0 80 80">
            <circle class="ring-bg" cx="40" cy="40" r="${RING_R}"></circle>
            <circle class="ring-fg" cx="40" cy="40" r="${RING_R}" stroke-dasharray="${RING_CIRC}" stroke-dashoffset="${dashoffset}"></circle>
          </svg>
          <div class="ring-center"><div class="timer">${formatTempo(restanteSeg)}</div></div>
        </div>
        <div class="aluno-info">
          <p class="nome">${escapeHtml(nomeAluno)}</p>
          <p class="cenario">${escapeHtml(cenarioAtual.nome)}</p>
          ${status === 'late' ? '<span class="badge late">Atrasado</span>' : status === 'warn' ? '<span class="badge warn">Acabando</span>' : '<span class="badge ok">No tempo</span>'}
        </div>
      </div>
      <div class="estimate">${estimativaMin > 0 ? `+${estimativaMin} min estimados em ${naoVisitados.length} cenário(s)` : 'Último cenário do circuito'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="painel-grid-cards">${cards}</div>`;
}

function safe(fn) {
  try { fn(); } catch (err) { console.error('Erro ao renderizar painel:', err); }
}

function renderPainel() {
  safe(renderPainelQueue);
  safe(renderPainelCircuito);
}

// Cache local do painel — preenchido direto do Supabase a cada 2s
// independente de qualquer método do storage.js
const painelCache = { agendamentos: null, atribuicoes: null, alunos: null, cenarios: null };
let painelClient = null;

function getPainelClient() {
  if (painelClient) return painelClient;
  try {
    if (typeof supabase !== 'undefined' && typeof SUPABASE_URL === 'string' && !SUPABASE_URL.includes('COLE_AQUI')) {
      painelClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {}
  return painelClient;
}

async function buscarDadosSupabase() {
  const client = getPainelClient();
  if (!client) return false;
  try {
    const [resAg, resAt, resAl, resCe] = await Promise.all([
      client.from('agendamentos').select('*'),
      client.from('atribuicoes_ativas').select('*'),
      client.from('alunos').select('*'),
      client.from('cenarios').select('*'),
    ]);
    if (!resAg.error) painelCache.agendamentos = resAg.data;
    if (!resAt.error) painelCache.atribuicoes = resAt.data;
    if (!resAl.error) painelCache.alunos = resAl.data;
    if (!resCe.error) painelCache.cenarios = resCe.data;
    return true;
  } catch (e) { return false; }
}

// Conversores de linha do banco para objeto do app
function agFromRow(r) { return { id: r.id, alunoId: r.aluno_id, cenarioInicialId: r.cenario_inicial_id, horario: r.horario || '', chegou: r.chegou, status: r.status || 'aguardando' }; }
function atFromRow(r) { return { id: r.id, alunoId: r.aluno_id, cenarioAtualId: r.cenario_atual_id, visitados: r.visitados || [], inicioPosicaoAtual: r.inicio_posicao_atual }; }
function alFromRow(r) { return { id: r.id, nome: r.nome, curso: r.curso }; }
function ceFromRow(r) { return { id: r.id, nome: r.nome, duracaoMin: r.duracao_min }; }

function getDadosPainel() {
  // Tenta usar o painelCache (dados frescos do banco)
  if (painelCache.agendamentos !== null) {
    return {
      agendamentos: painelCache.agendamentos.map(agFromRow),
      atribuicoes: painelCache.atribuicoes.map(atFromRow),
      alunos: painelCache.alunos.map(alFromRow),
      cenarios: painelCache.cenarios.map(ceFromRow),
    };
  }
  // Fallback: usa o cache do Store (localStorage ou Supabase Realtime)
  return {
    agendamentos: Store.getAgendamentos(),
    atribuicoes: Store.getAtribuicoesAtivas(),
    alunos: Store.getAlunos(),
    cenarios: Store.getCenarios(),
  };
}

safe(tickClock);
safe(renderSyncStatus);
safe(renderPainel);

// Busca inicial + atualização a cada 2s
async function loopAtualizacao() {
  await buscarDadosSupabase();
  safe(renderPainel);
}
loopAtualizacao();
setInterval(loopAtualizacao, 2000);

// Relógio e timers a cada 1s
setInterval(() => {
  safe(tickClock);
  safe(renderSyncStatus);
  safe(renderPainel);
}, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
