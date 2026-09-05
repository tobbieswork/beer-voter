-- DDL for users table to replace guests
CREATE TABLE users (
    id UUID PRIMARY KEY,
    auth_method VARCHAR(20) NOT NULL, -- 'guest' or 'google'
    username VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    real_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    email VARCHAR(255),
    avatar VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Optional: Create index on google_id for fast lookups during OAuth login
CREATE INDEX idx_users_google_id ON users(google_id);

-- Optional: Migrate existing guests if they exist
-- INSERT INTO users (id, auth_method, username, nickname, real_name, password_hash, created_at)
-- SELECT id, 'guest', username, nickname, real_name, password_hash, created_at FROM guests;
