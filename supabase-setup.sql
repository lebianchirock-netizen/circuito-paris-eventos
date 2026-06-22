-- Execute este script completo no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > colar tudo > Run)

create table if not exists cenarios (
  id text primary key,
  nome text not null,
  duracao_min integer not null
);

create table if not exists alunos (
  id text primary key,
  nome text not null,
  curso text
);

create table if not exists agendamentos (
  id text primary key,
  aluno_id text not null,
  cenario_inicial_id text not null,
  horario text not null,
  chegou boolean not null default false,
  hora_chegada bigint,
  status text not null default 'aguardando'
);

create table if not exists atribuicoes_ativas (
  id text primary key,
  aluno_id text not null,
  cenario_atual_id text not null,
  visitados text[] not null default '{}',
  inicio_posicao_atual bigint not null
);

create table if not exists historico (
  id text primary key,
  aluno_nome text not null,
  cenario_nome text not null,
  duracao_prevista_min numeric not null,
  duracao_real_min numeric not null,
  quando bigint not null
);

-- Libera o acesso para a chave "anon" (a chave pública usada pelo app).
-- Não há login nessa primeira versão, então qualquer dispositivo com o link
-- do app e essa chave consegue ler/escrever. Adequado para uso interno;
-- evite publicar o app num link totalmente público sem adicionar
-- autenticação depois.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  cenarios, alunos, agendamentos, atribuicoes_ativas, historico
  to anon, authenticated;

-- Garante que as mudanças nas tabelas sejam transmitidas em tempo real.
alter publication supabase_realtime add table
  cenarios, alunos, agendamentos, atribuicoes_ativas, historico;

-- ============================================================
-- MIGRAÇÃO: rode só isto se você já tinha rodado este script
-- antes (ou seja, as tabelas já existiam). A linha "create table
-- if not exists" acima não adiciona colunas novas em tabelas já
-- existentes, então é preciso este comando separado:
-- ============================================================
alter table agendamentos add column if not exists status text not null default 'aguardando';

