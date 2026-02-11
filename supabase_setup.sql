-- 1. Create Confessions Table
create table if not exists public.confessions (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  category text not null,
  author_id text not null,
  author_alias text not null,
  author_avatar_index integer default 0,
  author_karma integer default 0,
  media_url text,
  media_type text,
  media_thumbnail text,
  is_after_dark boolean default false,
  reactions jsonb default '{"fire": [], "heart": [], "laugh": [], "shock": [], "sad": []}'::jsonb,
  comment_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Crushes Table
create table if not exists public.crushes (
  id uuid default gen_random_uuid() primary key,
  from_user_id text not null,
  to_alias text not null,
  message text not null,
  is_revealed boolean default false,
  is_mutual boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Market Items Table
create table if not exists public.market_items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  price numeric not null,
  category text not null,
  condition text not null,
  seller_id text not null,
  seller_alias text not null,
  seller_karma integer default 0,
  seller_avatar_index integer default 0,
  is_sold boolean default false,
  image_urls text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Comments Table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid not null,
  parent_type text not null,
  content text not null,
  author_id text not null,
  author_alias text not null,
  author_avatar_index integer default 0,
  author_karma integer default 0,
  likes text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Enable RLS
alter table public.confessions enable row level security;
alter table public.crushes enable row level security;
alter table public.market_items enable row level security;
alter table public.comments enable row level security;

-- 6. Create Open Policies (MVP Style)
create policy "Public Access Confessions" on public.confessions for all using (true) with check (true);
create policy "Public Access Crushes" on public.crushes for all using (true) with check (true);
create policy "Public Access Market" on public.market_items for all using (true) with check (true);
create policy "Public Access Comments" on public.comments for all using (true) with check (true);

-- 7. Storage
insert into storage.buckets (id, name, public) values ('whispr-media', 'whispr-media', true) on conflict (id) do nothing;
create policy "Public Access Media" on storage.objects for all using ( bucket_id = 'whispr-media' ) with check ( bucket_id = 'whispr-media' );
