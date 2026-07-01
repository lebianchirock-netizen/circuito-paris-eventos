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
  const alunoPorId = Object.fromEntries(Store.getAlunos().map((a) => [a.id, a]));
  const cenarioPorId = Object.fromEntries(Store.getCenarios().map((c) => [c.id, c]));

  const presentes = Store.getAgendamentos()
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
  const ativas = Store.getAtribuicoesAtivas();
  const cenarios = Store.getCenarios();
  const alunos = Store.getAlunos();
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

Store.onChange(() => safe(renderPainel));

safe(tickClock);
safe(renderSyncStatus);
safe(renderPainel);
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
