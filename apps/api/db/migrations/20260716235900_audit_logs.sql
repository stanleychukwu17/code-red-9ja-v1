-- +goose Up
CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- WHERE did it happen? (e.g., "admin", "parties", "party_history")
    module VARCHAR(50),

    -- WHO did it?
    actor_id BIGINT NOT NULL REFERENCES users(id),
    actor_role VARCHAR(50), 
    
    -- WHAT did they do?
    action VARCHAR(50) NOT NULL, 
    
    -- TO WHAT did they do it?
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL, 
    
    -- WHAT changed?
    old_values JSONB, 
    new_values JSONB, 
    
    -- CONTEXT 
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
