CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(16) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaderboard (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    score INT NOT NULL,
    wpm INT NOT NULL DEFAULT 0,
    accuracy INT NOT NULL DEFAULT 0,
    difficulty VARCHAR(16) NOT NULL,
    pack VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leaderboard_scope (difficulty, pack, score),
    INDEX idx_leaderboard_user (user_id, created_at),
    CONSTRAINT fk_leaderboard_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_packs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(60) NOT NULL,
    description VARCHAR(240) DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    review_reason VARCHAR(240) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_custom_packs_owner (owner_id, status),
    INDEX idx_custom_packs_status (status, updated_at),
    CONSTRAINT fk_custom_packs_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_pack_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pack_id BIGINT NOT NULL,
    term VARCHAR(80) NOT NULL,
    description VARCHAR(180) NOT NULL,
    sources_json TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_custom_pack_items_pack (pack_id, sort_order),
    CONSTRAINT fk_custom_pack_items_pack
        FOREIGN KEY (pack_id) REFERENCES custom_packs(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_pack_scores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pack_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    score INT NOT NULL,
    wpm INT NOT NULL DEFAULT 0,
    accuracy INT NOT NULL DEFAULT 0,
    difficulty VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_custom_pack_scores_pack (pack_id, difficulty, score),
    INDEX idx_custom_pack_scores_user (user_id, created_at),
    CONSTRAINT fk_custom_pack_scores_pack
        FOREIGN KEY (pack_id) REFERENCES custom_packs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_custom_pack_scores_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
