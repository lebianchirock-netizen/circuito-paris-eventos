// Senha de acesso ao painel de controle (index.html).
// O painel público (painel-publico.html) NÃO usa essa senha — continua
// livre para qualquer pessoa ver, de propósito.
//
// Importante: como este é um app que roda só no navegador (sem servidor
// próprio), essa senha funciona como uma trava simples contra acesso
// casual ao link — não é segurança forte, porque qualquer pessoa com
// acesso ao código-fonte do app consegue ver esse valor. Para uso interno
// da equipe isso já resolve bem; para algo à prova de acesso técnico
// seria necessário um login real via Supabase Auth.

const ADMIN_PASSWORD = 'paris2026';
