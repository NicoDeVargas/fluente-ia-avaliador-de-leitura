create table if not exists leituras (
  id uuid primary key default gen_random_uuid(),
  idioma text not null,
  texto_id text not null,
  apelido text not null,
  ano int not null,
  corretas int not null,
  erros int not null,
  lidas int not null,
  segundos numeric not null,
  pcpm numeric not null,
  alinhamento jsonb not null,
  palavras jsonb not null,
  contagem_manual int,
  ip_hash text not null,
  criada_em timestamptz not null default now()
);

create index if not exists leituras_criada_em on leituras (criada_em);
create index if not exists leituras_ip_hash on leituras (ip_hash, criada_em);
