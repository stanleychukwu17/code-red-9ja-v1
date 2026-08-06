-- +goose Up
CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- WHERE did it happen? (e.g., "admin", "parties", "party_history")
    module VARCHAR(50),

    -- WHAT did they do?
    action VARCHAR(50) NOT NULL, 

    -- WHO did it?
    actor_id BIGINT NOT NULL,
    actor_role VARCHAR(50), 
    
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

CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
