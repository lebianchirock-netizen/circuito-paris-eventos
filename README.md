# Circuito de cenários — app do estúdio

PWA (web app instalável) para controlar o tempo dos alunos no circuito de
cenários do estúdio: cadastro de cenários e alunos, criação de sessões,
painel com timers em tempo real, e histórico.

## Como rodar

Navegadores bloqueiam alguns recursos (como o service worker) quando o
arquivo é aberto direto como `file://`. Rode um servidor local simples na
pasta do projeto:

```
cd circuito-app
python3 -m http.server 8000
```

Abra `http://localhost:8000` no navegador do computador, tablet ou celular
(todos precisam estar na mesma rede Wi-Fi). No celular/tablet, abra o menu
do navegador e escolha "Adicionar à tela inicial" — isso instala o app como
PWA, com ícone próprio e sem a barra de endereço do navegador.

## Como usar

1. Cadastre os cenários (Cenários) com o tempo padrão de cada um.
2. Cadastre os alunos manualmente ou importe a planilha modelo (Alunos >
   Importar planilha). A planilha precisa ter as colunas "Nome do aluno" e
   "Curso/Turma" como no modelo enviado anteriormente.
3. Em "Agenda", cadastre o horário previsto de chegada de cada aluno e o
   cenário em que ele vai começar. Esses alunos aparecem como "Próximos a
   entrar" no topo do Circuito ativo, ordenados pelo horário, com a
   contagem até a hora prevista.
4. Quando o aluno chegar de verdade, toque em "Iniciar agora" (na Agenda ou
   direto no card da fila) — é nesse momento que o timer real começa a
   contar, não no horário agendado. O agendamento é só para planejamento.
5. O painel "Em circuito agora" mostra o tempo restante de cada aluno (anel
   regressivo) e quanto ainda falta no circuito. Em cada card você escolhe
   no seletor "Mover para" o próximo cenário (a lista já sugere primeiro os
   cenários ainda não visitados) e confirma em "Mover aluno" — isso registra
   no histórico o tempo real gasto no cenário atual e inicia a contagem no
   novo. O botão "Concluir" finaliza o circuito daquele aluno a qualquer
   momento, mesmo que ainda falte cenário.

## Visual

Tema claro (fundo branco/lavanda bem suave) com a identidade roxo e
amarelo: roxo é o acento principal (botões, navegação, "no tempo"), amarelo
marca avisos e o selo de quem já chegou, e vermelho aparece tanto para
atraso quanto como indicador extra no gráfico — uma barra de "tempo real"
fica vermelha automaticamente quando aquele cenário, em média, passa do
tempo previsto. O cabeçalho mostra as logos da Paris Eventos e da Enjoy
Picture ao lado do título "Painel de Controle".

## Confirmação de chegada

Na Agenda (e também direto na fila do Circuito ativo), cada aluno agendado
tem um botão "Chegou"/"Confirmar chegada". Ao confirmar, ele recebe o selo
"No estúdio" e fica destacado na fila, deixando claro quem já está
fisicamente no local esperando para entrar no circuito — separado da ação
de "Iniciar agora", que é o que de fato dispara o timer.

## Análise no histórico

A aba Histórico agora tem filtro por dia e por cenário, métricas (total de
passagens, tempo total, média por passagem) e um gráfico comparando o
tempo previsto com o tempo real gasto em cada cenário — útil para ver quais
cenários costumam atrasar o circuito.

## Painel público (somente visualização)

Além do painel de controle (`index.html`), há um segundo painel,
`painel-publico.html`, pensado para ficar exposto numa tela/tablet no
estúdio. Ele mostra só visualização, sem nenhum botão de edição: quem está
aguardando para entrar (apenas alunos já marcados como "chegou") e quem
está em circuito agora com o tempo restante. Os dois painéis têm um link
um para o outro no cabeçalho. Com a sincronização configurada (veja a
seção abaixo), esse painel pode ficar aberto em qualquer dispositivo —
tablet, celular ou uma TV — e atualiza em tempo real junto com o painel de
controle. Sem a sincronização configurada, ele só mostra os dados certos
se for aberto no mesmo navegador/dispositivo do painel de controle.

## Resetar o circuito

No topo do "Circuito ativo" tem um botão "Resetar circuito". Ele limpa quem
está em circuito agora e a fila de "próximos a entrar" — útil para começar
um novo dia do zero. Pede confirmação antes de limpar e não toca nos
cadastros de cenários/alunos nem no histórico já registrado.

## Acompanhamento da agenda (quem já está no circuito)

A Agenda agora é também um painel do dia inteiro: cada aluno agendado
mostra um status — "Aguardando", "Em circuito" (com o cenário atual e o
tempo restante, atualizando ao vivo) ou "Concluído". Antes, o aluno
simplesmente desaparecia da Agenda ao ser iniciado; agora ele continua
visível, só muda de status, então você sempre consegue ver de onde veio
quem está no circuito agora. No topo da Agenda também tem contadores
rápidos: quantos aguardando, quantos em circuito, quantos já concluíram
hoje. A fila "Próximos a entrar" no Circuito ativo mostra só quem ainda
está aguardando, para não duplicar com quem já apareceu lá embaixo em "Em
circuito agora".

**Se você já configurou o Supabase antes desta atualização**, é necessário
rodar mais uma linha de SQL para adicionar a coluna nova. No SQL Editor do
Supabase, rode:
```sql
alter table agendamentos add column if not exists status text not null default 'aguardando';
```
(Essa linha também está no final do `supabase-setup.sql` atualizado, na
seção marcada como "MIGRAÇÃO".)

## Senha de administrador

O painel de controle (`index.html`) agora pede uma senha antes de mostrar
qualquer coisa. O painel público (`painel-publico.html`) continua livre,
de propósito — é o que fica exposto pra todo mundo ver.

Para trocar a senha (vem com `troque-essa-senha` por padrão — troque antes
de publicar!), edite o arquivo `js/admin-config.js` e salve. O login fica
válido só durante a sessão do navegador; ao fechar a aba/navegador, pede a
senha de novo. Tem um link "Sair" no cabeçalho para encerrar manualmente
num computador compartilhado.

Importante: como é um app que roda só no navegador, essa senha é uma trava
simples contra acesso casual pelo link — não é segurança forte, porque
qualquer pessoa que abrir o código-fonte do app (inclusive olhando os
arquivos no GitHub, se o repositório for público) consegue ver o valor.
Para algo realmente seguro, seria necessário um login de verdade via
Supabase Auth.

## Editar e excluir registros do histórico

Cada linha da tabela em Histórico tem botões "Editar" e "Excluir". Editar
deixa corrigir o nome do aluno/cenário ou os minutos previstos/reais
direto na linha (útil pra corrigir um engano); Excluir remove o registro
depois de confirmar. Como o histórico nunca é limpo automaticamente (nem
o botão "Resetar circuito" toca nele) e fica salvo no Supabase, as
informações não se perdem — só saem de lá se alguém excluir
deliberadamente.

## Publicar online (GitHub Pages)

Para outras pessoas acessarem o painel público (ou o de controle, com a
senha) por um link, sem precisar de um servidor próprio:

**Passo 1 — Subir o código para o GitHub**
Se você prefere sem usar terminal: crie um repositório novo em
github.com → "Create repository" → depois, na página do repositório,
"uploading an existing file" e arraste todos os arquivos desta pasta
(inclusive as pastas `css`, `js`, `assets`, `icons`).

Se preferir usar git:
```
cd circuito-app
git init
git add .
git commit -m "Primeira versão do painel"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

**Passo 2 — Ativar o GitHub Pages**
No repositório, vá em Settings → Pages. Em "Source", escolha "Deploy from
a branch", selecione a branch `main` e a pasta `/ (root)`, depois Save.
Em 1-2 minutos o site fica disponível em
`https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

**Sobre repositório público x privado:** repositórios privados só
conseguem publicar com GitHub Pages em planos pagos (Pro/Team/Enterprise).
Num repositório público, qualquer pessoa pode ver o código-fonte do app
no GitHub — incluindo a senha de admin e a chave do Supabase. Isso não
aumenta o risco em relação ao site já publicado (o navegador de qualquer
visitante já baixa esse mesmo código para rodar a página), mas torna mais
fácil de encontrar por acaso. Para uso interno da equipe, isso geralmente
é aceitável; se quiser mais privacidade, considere um plano pago do
GitHub ou outro serviço de hospedagem com repositório privado.

Depois de publicado, compartilhe o link `.../painel-publico.html` com
quem só precisa visualizar, e o link da raiz (`.../`) com quem vai
administrar (vai pedir a senha).

## Sincronização em tempo real entre dispositivos (Supabase)

O app já vem com a sincronização implementada — falta só você criar um
projeto gratuito no Supabase e colar duas informações num arquivo. Sem
isso, o app continua funcionando normalmente, só que sem sincronizar entre
aparelhos (como antes).

**Passo 1 — Criar o projeto**
Entre em [supabase.com](https://supabase.com), crie uma conta gratuita e
clique em "New project". Escolha um nome e uma senha de banco (guarde essa
senha, mas você não vai precisar dela no app). Espere o projeto terminar
de ser criado (1-2 minutos).

**Passo 2 — Criar as tabelas**
No menu lateral do projeto, abra "SQL Editor" → "New query". Abra o
arquivo `supabase-setup.sql` (incluso neste zip), copie todo o conteúdo,
cole no editor e clique em "Run". Isso cria as tabelas, libera o acesso
para o app e ativa o tempo real.

**Passo 3 — Copiar as credenciais**
No menu lateral, vá em "Project Settings" (ícone de engrenagem) → "Data
API". Copie o valor de "Project URL" e, em "Project API keys", copie a
chave marcada como "anon" / "public".

**Passo 4 — Colar no app**
Abra `js/supabase-config.js` num editor de texto e substitua
`COLE_AQUI_A_PROJECT_URL` e `COLE_AQUI_A_ANON_KEY` pelos valores copiados.
Salve o arquivo.

Pronto — abra o app de novo (em qualquer dispositivo, usando o mesmo link
ou pasta) e o indicador no cabeçalho deve mudar para "Sincronizado em
tempo real". Cadastros, fila, circuito ativo e histórico agora ficam
salvos na nuvem e aparecem instantaneamente em todos os dispositivos
conectados — inclusive no painel público.

Se o indicador ficar em "Erro de conexão", confira se copiou a URL e a
chave certas, e se o script `supabase-setup.sql` rodou sem erros no painel
do Supabase.
