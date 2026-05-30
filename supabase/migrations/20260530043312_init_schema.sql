-- 1. Bảng events
CREATE TABLE IF NOT EXISTS public.events (
    id text PRIMARY KEY,
    title text NOT NULL,
    creator_id text NOT NULL,
    creator_name text NOT NULL,
    creator_nickname text,
    creator_real_name text,
    creator_username text,
    creator_token text,
    party_pin_hash text,
    party_pin text,
    status text DEFAULT 'voting'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    locked_at timestamp with time zone,
    final_date_time text,
    final_location text,
    final_beer_style text
);

-- 2. Bảng options
CREATE TABLE IF NOT EXISTS public.options (
    id text PRIMARY KEY,
    event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'datetime' | 'location' | 'beer'
    value text NOT NULL,
    creator_id text NOT NULL,
    creator_name text NOT NULL,
    creator_nickname text,
    creator_real_name text,
    creator_username text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng votes
CREATE TABLE IF NOT EXISTS public.votes (
    id text PRIMARY KEY,
    event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    option_id text NOT NULL REFERENCES public.options(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_nickname text,
    user_real_name text,
    user_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Bảng comments
CREATE TABLE IF NOT EXISTS public.comments (
    id text PRIMARY KEY,
    event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_role text,
    content text NOT NULL,
    user_nickname text,
    user_real_name text,
    user_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bảng guests
CREATE TABLE IF NOT EXISTS public.guests (
    id text PRIMARY KEY,
    username text UNIQUE NOT NULL,
    nickname text NOT NULL,
    real_name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
    -- Test trigger CD 