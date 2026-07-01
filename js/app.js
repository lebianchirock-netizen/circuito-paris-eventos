// ---------- Navegação entre telas ----------
const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('#nav button');

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    views.forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    renderAll();
  });
});

// ---------- Relógio do cabeçalho ----------
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

Store.onChange(() => safe(renderAll));

// ---------- Cenários ----------
document.getElementById('form-cenario').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('cenario-nome').value.trim();
  const duracao = parseInt(document.getElementById('cenario-duracao').value, 10);
  if (!nome || !duracao) return;
  const cenarios = Store.getCenarios();
  cenarios.push({ id: Store.uid(), nome, duracaoMin: duracao });
  Store.setCenarios(cenarios);
  e.target.reset();
  document.getElementById('cenario-duracao').value = 10;
  renderAll();
});

function renderCenarios() {
  const cenarios = Store.getCenarios();
  const el = document.getElementById('cenarios-list');
  if (cenarios.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum cenário cadastrado ainda.</div>';
    return;
  }
  el.innerHTML = '<div class="card">' + cenarios.map((c) => `
    <div class="list-row">
      <div>
        <div style="font-weight:500;">${escapeHtml(c.nome)}</div>
        <div class="hint" style="margin:0;">${c.duracaoMin} min</div>
      </div>
      <button class="danger-btn" data-id="${c.id}" data-action="del-cenario">Remover</button>
    </div>`).join('') + '</div>';
}

// ---------- Alunos ----------
document.getElementById('form-aluno').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('aluno-nome').value.trim();
  if (!nome) return;
  const alunos = Store.getAlunos();
  alunos.push({
    id: Store.uid(),
    nome,
    curso: document.getElementById('aluno-curso').value.trim(),
    faculdade: document.getElementById('aluno-faculdade').value.trim(),
    periodo: document.getElementById('aluno-periodo').value.trim(),
    contrato: document.getElementById('aluno-contrato').value.trim(),
    telefone: document.getElementById('aluno-telefone').value.trim(),
    horario: document.getElementById('aluno-horario').value.trim(),
    convidados: document.getElementById('aluno-convidados').value.trim(),
    pet: document.getElementById('aluno-pet').value,
    confirmado: document.getElementById('aluno-confirmado').value,
    observacao: document.getElementById('aluno-observacao').value.trim()
  });
  Store.setAlunos(alunos);
  e.target.reset();
  renderAll();
});

function campoInfo(label, valor) {
  if (!valor) return '';
  return `<span style="margin-right:14px;"><span style="color:var(--text-faint);">${label}:</span> ${escapeHtml(valor)}</span>`;
}

function renderAlunos() {
  const alunos = Store.getAlunos();
  const el = document.getElementById('alunos-list');
  if (alunos.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum aluno cadastrado ainda.</div>';
    return;
  }
  el.innerHTML = alunos.map((a) => `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:600;">${escapeHtml(a.nome)}</span>
          ${a.confirmado === 'Sim' ? '<span class="badge ok">Confirmado</span>' : ''}
          ${a.confirmado === 'Não' ? '<span class="badge warn">Não confirmado</span>' : ''}
        </div>
        <button class="danger-btn" data-id="${a.id}" data-action="del-aluno">Remover</button>
      </div>
      <div class="hint" style="margin:0;line-height:1.8;">
        ${campoInfo('Curso', a.curso)}${campoInfo('Faculdade', a.faculdade)}${campoInfo('Período', a.periodo)}${campoInfo('Contrato', a.contrato)}${campoInfo('Telefone', a.telefone)}${campoInfo('Horário', a.horario)}${campoInfo('Convidados', a.convidados)}${campoInfo('Pet', a.pet)}
        ${a.observacao ? `<div style="margin-top:4px;font-style:italic;">${escapeHtml(a.observacao)}</div>` : ''}
      </div>
    </div>`).join('');
}

// Converte célula de horário do Excel (pode vir como número decimal, texto ou já HH:MM) para "HH:MM"
function excelTimeToHHMM(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    const totalMinutos = Math.round((value % 1) * 24 * 60);
    const h = Math.floor(totalMinutos / 60) % 24;
    const m = totalMinutos % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) return match[1].padStart(2, '0') + ':' + match[2];
  return str;
}

// Importação da planilha (modelo .xlsx de alunos)
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const feedback = document.getElementById('import-feedback');
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames.includes('Alunos') ? 'Alunos' : workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    const alunos = Store.getAlunos();
    const cenarios = Store.getCenarios();
    const agendamentos = Store.getAgendamentos();
    const jaAgendado = new Set(agendamentos.map((ag) => ag.alunoId));

    let novos = 0;
    let ignorados = 0;
    let agendados = 0;
    let semHorario = 0;
    let cicloCenario = 0;

    rows.forEach((row) => {
      const nome = String(row['NOME'] || row['Nome do aluno'] || '').trim();
      const curso = String(row['CURSO'] || row['Curso/Turma'] || '').trim();
      if (!nome) { ignorados++; return; }
      const jaExiste = alunos.some((a) => a.nome.toLowerCase() === nome.toLowerCase() && a.curso === curso);
      if (jaExiste) { ignorados++; return; }

      const novoAluno = {
        id: Store.uid(),
        nome,
        curso,
        faculdade: String(row['FACULDADE'] || '').trim(),
        periodo: String(row['PERÍODO'] || row['PERIODO'] || '').trim(),
        contrato: String(row['CONTRATO'] || '').trim(),
        telefone: String(row['TELEFONE'] || '').trim(),
        horario: excelTimeToHHMM(row['HORÁRIO'] || row['HORARIO']),
        convidados: String(row['CONVIDADOS'] || '').trim(),
        pet: String(row['PET'] || '').trim(),
        confirmado: String(row['CONFIRMADO'] || '').trim(),
        observacao: String(row['OBSERVAÇÃO'] || row['OBSERVACAO'] || '').trim()
      };
      alunos.push(novoAluno);
      novos++;

      // Agenda automática: se tem horário e ainda não está agendado, cria a entrada na Agenda
      if (!novoAluno.horario) {
        semHorario++;
      } else if (cenarios.length > 0 && !jaAgendado.has(novoAluno.id)) {
        const cenarioInicial = cenarios[cicloCenario % cenarios.length];
        cicloCenario++;
        agendamentos.push({
          id: Store.uid(),
          alunoId: novoAluno.id,
          cenarioInicialId: cenarioInicial.id,
          horario: novoAluno.horario,
          chegou: false,
          status: 'aguardando'
        });
        agendados++;
      }
    });

    Store.setAlunos(alunos);
    if (agendados > 0) Store.setAgendamentos(agendamentos);
    renderAll();

    let msg = `${novos} aluno(s) importado(s). ${ignorados} linha(s) ignorada(s) (vazias ou já cadastradas).`;
    if (cenarios.length === 0 && novos > 0) {
      msg += ' Cadastre os cenários antes de importar para a agenda ser preenchida automaticamente.';
    } else if (agendados > 0) {
      msg += ` ${agendados} aluno(s) adicionados à Agenda automaticamente.`;
    }
    if (semHorario > 0) {
      msg += ` ${semHorario} aluno(s) sem HORÁRIO preenchido na planilha não foram agendados — adicione manualmente pela Agenda se precisar.`;
    }
    feedback.innerHTML = `<p class="hint" style="margin-top:8px;color:var(--success);">${msg}</p>`;
  } catch (err) {
    feedback.innerHTML = `<p class="hint" style="margin-top:8px;color:var(--danger);">Não foi possível ler o arquivo. Confirme que é o modelo .xlsx exportado e tente novamente.</p>`;
  }
  e.target.value = '';
});

document.getElementById('btn-reset-circuito').addEventListener('click', () => {
  const confirmado = confirm('Isso vai limpar todos os alunos em circuito agora e a fila de "próximos a entrar". Cadastros de cenários, alunos e o histórico não são afetados. Continuar?');
  if (!confirmado) return;
  Store.setAtribuicoesAtivas([]);
  Store.setAgendamentos([]);
  renderAll();
});

// ---------- Agenda (fila de próximos a entrar) ----------
function renderAgendaSelects() {
  const alunoSelect = document.getElementById('agenda-aluno');
  const cenarioSelect = document.getElementById('agenda-cenario');
  const alunos = Store.getAlunos();
  const cenarios = Store.getCenarios();

  alunoSelect.innerHTML = alunos.map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('');
  cenarioSelect.innerHTML = cenarios.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');

  const horarioInput = document.getElementById('agenda-horario');
  if (!horarioInput.value) horarioInput.value = currentHHMM();
}

document.getElementById('form-agenda').addEventListener('submit', (e) => {
  e.preventDefault();
  const alunoId = document.getElementById('agenda-aluno').value;
  const cenarioInicialId = document.getElementById('agenda-cenario').value;
  const horario = document.getElementById('agenda-horario').value;
  if (!alunoId || !cenarioInicialId || !horario) return;

  const agendamentos = Store.getAgendamentos();
  agendamentos.push({ id: Store.uid(), alunoId, cenarioInicialId, horario, chegou: false, status: 'aguardando' });
  Store.setAgendamentos(agendamentos);
  document.getElementById('agenda-horario').value = currentHHMM();
  renderAll();
});

function renderAgendaList() {
  const el = document.getElementById('agenda-list');
  const agendamentos = Store.getAgendamentos().slice().sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  const alunoPorId = Object.fromEntries(Store.getAlunos().map((a) => [a.id, a]));
  const cenarios = Store.getCenarios();
  const cenarioPorId = Object.fromEntries(cenarios.map((c) => [c.id, c]));
  const ativaPorAluno = Object.fromEntries(Store.getAtribuicoesAtivas().map((a) => [a.alunoId, a]));

  if (agendamentos.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum horário agendado. Use o formulário acima para planejar a chegada dos alunos.</div>';
    return;
  }

  const aguardando = agendamentos.filter((a) => (a.status || 'aguardando') === 'aguardando').length;
  const emCircuito = agendamentos.filter((a) => a.status === 'em_circuito').length;
  const concluidos = agendamentos.filter((a) => a.status === 'concluido').length;

  const metrics = `
    <div class="metrics">
      <div class="metric"><div class="label">Aguardando</div><div class="value">${aguardando}</div></div>
      <div class="metric"><div class="label">Em circuito</div><div class="value accent">${emCircuito}</div></div>
      <div class="metric"><div class="label">Concluído hoje</div><div class="value">${concluidos}</div></div>
    </div>`;

  const linhas = agendamentos.map((ag) => {
    const aluno = alunoPorId[ag.alunoId];
    const cenarioPlanejado = cenarioPorId[ag.cenarioInicialId];
    const status = ag.status || 'aguardando';
    const nomeAluno = aluno ? aluno.nome : 'Aluno removido';

    let statusBadge = '';
    let infoLinha = `${ag.horario} · começa em ${cenarioPlanejado ? escapeHtml(cenarioPlanejado.nome) : '<span style="color:var(--danger);">cenário não encontrado, escolha um</span>'}`;
    let acoes = '';

    if (status === 'em_circuito') {
      const atribuicao = ativaPorAluno[ag.alunoId];
      statusBadge = '<span class="badge ok">Em circuito</span>';
      if (atribuicao) {
        const cenarioAtual = cenarioPorId[atribuicao.cenarioAtualId];
        if (cenarioAtual) {
          const restanteSeg = cenarioAtual.duracaoMin * 60 - (Date.now() - atribuicao.inicioPosicaoAtual) / 1000;
          infoLinha = `agora em ${escapeHtml(cenarioAtual.nome)} · ${formatTempo(restanteSeg)} ${restanteSeg < 0 ? 'além do previsto' : 'restantes'}`;
        }
      }
      acoes = `<button class="danger-btn" data-id="${ag.id}" data-action="del-agendamento" disabled title="Remova pelo Circuito ativo" style="opacity:0.4;cursor:not-allowed;">Remover</button>`;
    } else if (status === 'concluido') {
      statusBadge = '<span class="badge" style="background:var(--surface-2);color:var(--text-muted);">Concluído</span>';
      acoes = `<button class="danger-btn" data-id="${ag.id}" data-action="del-agendamento">Remover</button>`;
    } else {
      statusBadge = ag.chegou ? `<span class="pill-chegou"><svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.2l3 3 6-6.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>No estúdio</span>` : '';
      if (cenarios.length > 0) {
        infoLinha = `${ag.horario} · começa em
          <select onchange="trocarCenarioAgenda('${ag.id}', this.value)" style="display:inline-block;width:auto;margin:0 0 0 4px;padding:3px 6px;font-size:12.5px;">
            ${cenarios.map((c) => `<option value="${c.id}" ${c.id === ag.cenarioInicialId ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
          </select>`;
      } else {
        infoLinha = `${ag.horario} · <span style="color:var(--danger);">cadastre um cenário para poder iniciar</span>`;
      }
      acoes = `
        <button class="secondary" data-id="${ag.id}" data-action="toggle-chegada" style="padding:7px 12px;font-size:13px;">${ag.chegou ? 'Desfazer chegada' : 'Confirmar chegada'}</button>
        <button class="secondary" data-id="${ag.id}" data-action="iniciar-agendamento" style="padding:7px 12px;font-size:13px;${cenarioPlanejado ? '' : 'opacity:0.5;'}" ${cenarioPlanejado ? '' : 'disabled title="Escolha um cenário primeiro"'}>Iniciar agora</button>
        <button class="danger-btn" data-id="${ag.id}" data-action="del-agendamento">Remover</button>`;
    }

    return `
    <div class="list-row">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:500;">${escapeHtml(nomeAluno)}</span>
          ${statusBadge}
        </div>
        <div class="hint" style="margin:0;">${infoLinha}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">${acoes}</div>
    </div>`;
  }).join('');

  el.innerHTML = metrics + `<div class="card">${linhas}</div>`;
}

function trocarCenarioAgenda(agendamentoId, novoCenarioId) {
  const agendamentos = Store.getAgendamentos();
  const ag = agendamentos.find((a) => a.id === agendamentoId);
  if (!ag) return;
  ag.cenarioInicialId = novoCenarioId;
  Store.setAgendamentos(agendamentos);
  renderAgendaList();
}

function iniciarAgendamento(agendamentoId) {
  const agendamentos = Store.getAgendamentos();
  const agendamento = agendamentos.find((a) => a.id === agendamentoId);
  if (!agendamento) return;

  const ativas = Store.getAtribuicoesAtivas();
  ativas.push({
    id: Store.uid(),
    alunoId: agendamento.alunoId,
    cenarioAtualId: agendamento.cenarioInicialId,
    visitados: [agendamento.cenarioInicialId],
    inicioPosicaoAtual: Date.now()
  });
  Store.setAtribuicoesAtivas(ativas);

  agendamento.status = 'em_circuito';
  Store.setAgendamentos(agendamentos);
  renderAll();
}

// ---------- Remoção e ações (delegação de clique) ----------
document.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  const id = e.target.dataset.id;

  if (action === 'del-cenario') {
    Store.setCenarios(Store.getCenarios().filter((c) => c.id !== id));
    renderAll();
  }
  if (action === 'del-aluno') {
    Store.setAlunos(Store.getAlunos().filter((a) => a.id !== id));
    renderAll();
  }
  if (action === 'del-agendamento') {
    Store.setAgendamentos(Store.getAgendamentos().filter((a) => a.id !== id));
    renderAll();
  }
  if (action === 'toggle-chegada') {
    const agendamentos = Store.getAgendamentos();
    const ag = agendamentos.find((a) => a.id === id);
    if (ag) {
      ag.chegou = !ag.chegou;
      ag.horaChegada = ag.chegou ? Date.now() : null;
      Store.setAgendamentos(agendamentos);
      renderAll();
    }
  }
  if (action === 'iniciar-agendamento') {
    iniciarAgendamento(id);
  }
  if (action === 'mover') {
    const select = document.getElementById(e.target.dataset.select);
    if (select && select.value) moverAluno(id, select.value);
  }
  if (action === 'concluir') {
    concluirCircuito(id);
  }
  if (action === 'editar-historico') {
    editingHistoricoId = id;
    renderHistorico();
  }
  if (action === 'cancelar-edicao-historico') {
    editingHistoricoId = null;
    renderHistorico();
  }
  if (action === 'salvar-historico') {
    salvarEdicaoHistorico(id);
  }
  if (action === 'excluir-historico') {
    if (confirm('Excluir este registro do histórico? Essa ação não pode ser desfeita.')) {
      Store.setHistorico(Store.getHistorico().filter((h) => h.id !== id));
      renderHistorico();
    }
  }
});

// ---------- Dashboard / circuito ativo ----------
const RING_R = 34;
const RING_CIRC = 2 * Math.PI * RING_R;

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

function currentHHMM() {
  return new Date().toTimeString().slice(0, 5);
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

function renderQueue() {
  const agendamentos = Store.getAgendamentos().filter((ag) => (ag.status || 'aguardando') === 'aguardando').slice().sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  const alunoPorId = Object.fromEntries(Store.getAlunos().map((a) => [a.id, a]));
  const cenarioPorId = Object.fromEntries(Store.getCenarios().map((c) => [c.id, c]));

  if (agendamentos.length === 0) return '';

  const cards = agendamentos.map((ag) => {
    const aluno = alunoPorId[ag.alunoId];
    const cenario = cenarioPorId[ag.cenarioInicialId];
    const diffMin = minutosAteHorario(ag.horario);
    return `
    <div class="queue-card ${diffMin < 0 ? 'atrasado' : ''} ${ag.chegou ? 'chegou' : ''}">
      <div class="top-row">
        <div class="nome">${escapeHtml(aluno ? aluno.nome : 'Aluno removido')}</div>
      </div>
      ${ag.chegou ? `<span class="pill-chegou" style="margin-bottom:6px;"><svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.2l3 3 6-6.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>No estúdio</span>` : ''}
      <div class="info">${ag.horario || '--:--'} · ${cenario ? escapeHtml(cenario.nome) : '<span style="color:var(--danger);">ver na Agenda</span>'}</div>
      <div class="countdown">${formatContagem(diffMin)}</div>
      <div class="btn-row">
        ${ag.chegou
          ? `<button class="advance-btn" data-id="${ag.id}" data-action="iniciar-agendamento">Iniciar agora</button>`
          : `<button class="secondary" data-id="${ag.id}" data-action="toggle-chegada">Chegou</button><button class="advance-btn" data-id="${ag.id}" data-action="iniciar-agendamento">Iniciar</button>`}
      </div>
    </div>`;
  }).join('');

  return `<div class="section-label">Próximos a entrar</div><div class="queue-row">${cards}</div>`;
}

function renderDashboard() {
  const ativas = Store.getAtribuicoesAtivas();
  const cenarios = Store.getCenarios();
  const alunos = Store.getAlunos();
  const el = document.getElementById('dashboard-content');

  const queueHtml = renderQueue();

  if (ativas.length === 0) {
    el.innerHTML = queueHtml + '<div class="empty-state">Nenhum aluno em circuito agora. Inicie alguém pela agenda.</div>';
    return;
  }

  const cenarioPorId = Object.fromEntries(cenarios.map((c) => [c.id, c]));
  const alunoPorId = Object.fromEntries(alunos.map((a) => [a.id, a]));
  const livres = cenarios.length - new Set(ativas.map((a) => a.cenarioAtualId)).size;

  const metrics = `
    <div class="metrics">
      <div class="metric"><div class="label">Em circuito</div><div class="value">${ativas.length}</div></div>
      <div class="metric"><div class="label">Cenários livres</div><div class="value">${Math.max(livres, 0)} de ${cenarios.length}</div></div>
      <div class="metric"><div class="label">Na fila</div><div class="value">${Store.getAgendamentos().filter((ag) => (ag.status || 'aguardando') === 'aguardando').length}</div></div>
    </div>`;

  const cards = ativas.map((a) => {
    const aluno = alunoPorId[a.alunoId];
    const cenarioAtual = cenarioPorId[a.cenarioAtualId];
    const nomeAluno = aluno ? aluno.nome : 'Aluno removido';

    if (!cenarioAtual) {
      return `
      <div class="card aluno-card">
        <p class="nome" style="font-weight:600;margin:0 0 6px;">${escapeHtml(nomeAluno)}</p>
        <p class="estimate" style="color:var(--danger);">Cenário não encontrado (pode ter sido removido). Conclua para liberar este aluno.</p>
        <button class="advance-btn" data-id="${a.alunoId}" data-action="concluir">Concluir circuito</button>
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
    const jaVisitados = cenarios.filter((c) => c.id !== a.cenarioAtualId && visitados.includes(c.id));
    const opcoes = naoVisitados.concat(jaVisitados);
    const estimativaMin = naoVisitados.reduce((sum, c) => sum + c.duracaoMin, 0);
    const selectId = `mover-${a.id}`;

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
      <div class="estimate">${estimativaMin > 0 ? `+${estimativaMin} min estimados em ${naoVisitados.length} cenário(s)` : 'Todos os cenários já visitados'}</div>
      ${opcoes.length > 0 ? `
        <label for="${selectId}" style="margin-bottom:4px;">Mover para</label>
        <select id="${selectId}">
          ${opcoes.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}${visitados.includes(c.id) ? ' (repetir)' : ''}</option>`).join('')}
        </select>
        <div class="btn-row">
          <button class="advance-btn" data-id="${a.alunoId}" data-action="mover" data-select="${selectId}" style="margin-top:0;">Mover aluno</button>
          <button class="secondary" data-id="${a.alunoId}" data-action="concluir" style="margin-top:0;">Concluir</button>
        </div>` : `
        <button class="advance-btn" data-id="${a.alunoId}" data-action="concluir">Concluir circuito</button>`}
    </div>`;
  }).join('');

  el.innerHTML = queueHtml + metrics + `<div class="section-label">Em circuito agora</div><div class="grid-cards">${cards}</div>`;
}

function registrarHistorico(alunoId, atribuicao, cenarioPorId, alunoPorId) {
  const cenarioAtual = cenarioPorId[atribuicao.cenarioAtualId];
  if (!cenarioAtual) return;
  const duracaoRealSeg = (Date.now() - atribuicao.inicioPosicaoAtual) / 1000;
  const historico = Store.getHistorico();
  historico.push({
    id: Store.uid(),
    alunoNome: alunoPorId[alunoId] ? alunoPorId[alunoId].nome : 'Aluno removido',
    cenarioNome: cenarioAtual.nome,
    duracaoPrevistaMin: cenarioAtual.duracaoMin,
    duracaoRealMin: Math.round((duracaoRealSeg / 60) * 10) / 10,
    quando: Date.now()
  });
  Store.setHistorico(historico);
}

function moverAluno(alunoId, novoCenarioId) {
  const ativas = Store.getAtribuicoesAtivas();
  const cenarioPorId = Object.fromEntries(Store.getCenarios().map((c) => [c.id, c]));
  const alunoPorId = Object.fromEntries(Store.getAlunos().map((a) => [a.id, a]));

  const idx = ativas.findIndex((a) => a.alunoId === alunoId);
  if (idx === -1) return;
  const atribuicao = ativas[idx];
  if (!cenarioPorId[novoCenarioId]) return;

  registrarHistorico(alunoId, atribuicao, cenarioPorId, alunoPorId);

  atribuicao.cenarioAtualId = novoCenarioId;
  atribuicao.visitados = (atribuicao.visitados || []).concat(novoCenarioId);
  atribuicao.inicioPosicaoAtual = Date.now();

  Store.setAtribuicoesAtivas(ativas);
  renderDashboard();
}

function concluirCircuito(alunoId) {
  const ativas = Store.getAtribuicoesAtivas();
  const cenarioPorId = Object.fromEntries(Store.getCenarios().map((c) => [c.id, c]));
  const alunoPorId = Object.fromEntries(Store.getAlunos().map((a) => [a.id, a]));

  const idx = ativas.findIndex((a) => a.alunoId === alunoId);
  if (idx === -1) return;
  const atribuicao = ativas[idx];

  registrarHistorico(alunoId, atribuicao, cenarioPorId, alunoPorId);
  ativas.splice(idx, 1);
  Store.setAtribuicoesAtivas(ativas);

  const agendamentos = Store.getAgendamentos();
  const agendamento = agendamentos.find((a) => a.alunoId === alunoId && a.status === 'em_circuito');
  if (agendamento) {
    agendamento.status = 'concluido';
    Store.setAgendamentos(agendamentos);
  }

  renderDashboard();
}

// ---------- Histórico ----------
let historicoChartInstance = null;
let editingHistoricoId = null;

function popularFiltroCenario() {
  const select = document.getElementById('filtro-cenario');
  const atual = select.value;
  const nomes = Store.getCenarios().map((c) => c.nome);
  select.innerHTML = '<option value="">Todos os cenários</option>' +
    nomes.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (nomes.includes(atual)) select.value = atual;
}

document.getElementById('filtro-data').addEventListener('change', renderHistorico);
document.getElementById('filtro-cenario').addEventListener('change', renderHistorico);
document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
  document.getElementById('filtro-data').value = '';
  document.getElementById('filtro-cenario').value = '';
  renderHistorico();
});

function renderHistoricoRow(h) {
  if (h.id === editingHistoricoId) {
    return `
    <tr>
      <td><input type="text" id="edit-aluno-${h.id}" value="${escapeHtml(h.alunoNome)}" style="margin:0;min-width:90px;"></td>
      <td><input type="text" id="edit-cenario-${h.id}" value="${escapeHtml(h.cenarioNome)}" style="margin:0;min-width:90px;"></td>
      <td><input type="number" id="edit-previsto-${h.id}" value="${h.duracaoPrevistaMin}" style="margin:0;width:70px;"></td>
      <td><input type="number" id="edit-real-${h.id}" value="${h.duracaoRealMin}" style="margin:0;width:70px;"></td>
      <td>${new Date(h.quando).toLocaleString('pt-BR')}</td>
      <td style="white-space:nowrap;">
        <button class="secondary" data-id="${h.id}" data-action="salvar-historico" style="padding:5px 10px;font-size:12px;">Salvar</button>
        <button class="secondary" data-id="${h.id}" data-action="cancelar-edicao-historico" style="padding:5px 10px;font-size:12px;">Cancelar</button>
      </td>
    </tr>`;
  }
  return `
    <tr>
      <td>${escapeHtml(h.alunoNome)}</td>
      <td>${escapeHtml(h.cenarioNome)}</td>
      <td>${h.duracaoPrevistaMin} min</td>
      <td>${h.duracaoRealMin} min</td>
      <td>${new Date(h.quando).toLocaleString('pt-BR')}</td>
      <td style="white-space:nowrap;">
        <button class="secondary" data-id="${h.id}" data-action="editar-historico" style="padding:5px 10px;font-size:12px;">Editar</button>
        <button class="danger-btn" data-id="${h.id}" data-action="excluir-historico">Excluir</button>
      </td>
    </tr>`;
}

function salvarEdicaoHistorico(id) {
  const historico = Store.getHistorico();
  const item = historico.find((h) => h.id === id);
  if (!item) return;

  const aluno = document.getElementById(`edit-aluno-${id}`).value.trim();
  const cenario = document.getElementById(`edit-cenario-${id}`).value.trim();
  const previsto = parseFloat(document.getElementById(`edit-previsto-${id}`).value);
  const real = parseFloat(document.getElementById(`edit-real-${id}`).value);
  if (!aluno || !cenario || isNaN(previsto) || isNaN(real)) return;

  item.alunoNome = aluno;
  item.cenarioNome = cenario;
  item.duracaoPrevistaMin = previsto;
  item.duracaoRealMin = real;

  Store.setHistorico(historico);
  editingHistoricoId = null;
  renderHistorico();
}

function renderHistorico() {
  popularFiltroCenario();

  const filtroData = document.getElementById('filtro-data').value;
  const filtroCenario = document.getElementById('filtro-cenario').value;

  const todos = Store.getHistorico();
  const filtrado = todos.filter((h) => {
    if (filtroData) {
      const dataLocal = new Date(h.quando);
      const dataStr = dataLocal.getFullYear() + '-' + String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + String(dataLocal.getDate()).padStart(2, '0');
      if (dataStr !== filtroData) return false;
    }
    if (filtroCenario && h.cenarioNome !== filtroCenario) return false;
    return true;
  });

  const el = document.getElementById('historico-content');

  if (filtrado.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum registro para esse filtro ainda.</div>';
    if (historicoChartInstance) { historicoChartInstance.destroy(); historicoChartInstance = null; }
    return;
  }

  const tempoTotalMin = filtrado.reduce((sum, h) => sum + h.duracaoRealMin, 0);
  const mediaPorPassagem = tempoTotalMin / filtrado.length;

  const porCenario = {};
  filtrado.forEach((h) => {
    if (!porCenario[h.cenarioNome]) porCenario[h.cenarioNome] = { nome: h.cenarioNome, count: 0, somaPrevisto: 0, somaReal: 0 };
    const g = porCenario[h.cenarioNome];
    g.count += 1;
    g.somaPrevisto += h.duracaoPrevistaMin;
    g.somaReal += h.duracaoRealMin;
  });
  const grupos = Object.values(porCenario).map((g) => ({
    nome: g.nome,
    mediaPrevisto: Math.round((g.somaPrevisto / g.count) * 10) / 10,
    mediaReal: Math.round((g.somaReal / g.count) * 10) / 10
  }));

  const metrics = `
    <div class="metrics">
      <div class="metric"><div class="label">Passagens</div><div class="value">${filtrado.length}</div></div>
      <div class="metric"><div class="label">Tempo total</div><div class="value accent">${Math.round(tempoTotalMin)} min</div></div>
      <div class="metric"><div class="label">Média por passagem</div><div class="value">${Math.round(mediaPorPassagem * 10) / 10} min</div></div>
    </div>`;

  const legend = `
    <div class="legend-row">
      <div class="legend-item"><span class="legend-dot" style="background:var(--gold);"></span>Previsto (média)</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--accent);"></span>Real (dentro do previsto)</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--danger);"></span>Real (passou do previsto)</div>
    </div>`;

  el.innerHTML = metrics + '<div class="card">' + legend + '<div class="chart-wrap"><canvas id="historico-chart"></canvas></div></div>' +
    `<div class="card"><table>
      <tr><th>Aluno</th><th>Cenário</th><th>Previsto</th><th>Real</th><th>Quando</th><th>Ações</th></tr>
      ${filtrado.slice().reverse().slice(0, 100).map(renderHistoricoRow).join('')}
    </table></div>`;

  if (historicoChartInstance) historicoChartInstance.destroy();
  const ctx = document.getElementById('historico-chart');
  historicoChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: grupos.map((g) => g.nome),
      datasets: [
        { label: 'Previsto', data: grupos.map((g) => g.mediaPrevisto), backgroundColor: 'rgba(253,185,0,0.9)', borderRadius: 6, maxBarThickness: 34 },
        { label: 'Real', data: grupos.map((g) => g.mediaReal), backgroundColor: grupos.map((g) => g.mediaReal > g.mediaPrevisto ? 'rgba(220,38,38,0.88)' : 'rgba(124,31,214,0.88)'), borderRadius: 6, maxBarThickness: 34 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6B6480', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#6B6480', font: { size: 11 } }, grid: { color: 'rgba(28,16,48,0.06)' }, title: { display: true, text: 'minutos', color: '#948DA8', font: { size: 11 } } }
      }
    }
  });
}

// ---------- Util ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function safe(fn) {
  try { fn(); } catch (err) { console.error('Erro ao renderizar:', err); }
}

function renderAll() {
  safe(renderCenarios);
  safe(renderAlunos);
  safe(renderAgendaSelects);
  safe(renderAgendaList);
  safe(renderDashboard);
  safe(renderHistorico);
}

function selectAberto() {
  const el = document.activeElement;
  return el && el.tagName === 'SELECT';
}

safe(tickClock);
safe(renderSyncStatus);
safe(renderAll);
setInterval(() => {
  safe(tickClock);
  safe(renderSyncStatus);
  if (!selectAberto()) {
    safe(renderDashboard);
    safe(renderAgendaList);
  }
}, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
