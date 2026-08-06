-- +goose Up
CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- WHERE did it happen? (e.g., "admin", "parties", "party_history")
    module VARCHAR(50),

    -- WHAT did they do?
    action VARCHAR(50) NOT NULL, 

    -- WHO did it?
    actor_id BIGINT NOT NULL REFERENCES users(id),
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
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_actor_role ON audit_logs(actor_role);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
