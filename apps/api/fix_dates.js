const fs = require('fs');
let content = fs.readFileSync('internal/handler/election_results/handler.go', 'utf8');

// Replace struct fields
content = content.replace(/CreatedAt\s+\*string\s+`json:"created_at"`/g, 'CreatedAt        *time.Time      `json:"created_at"`');
content = content.replace(/UpdatedAt\s+\*string\s+`json:"updated_at"`/g, 'UpdatedAt        *time.Time      `json:"updated_at"`');

// Replace variable declarations
content = content.replace(/frCreatedAt, frUpdatedAt\s+\*string/g, 'frCreatedAt, frUpdatedAt   *time.Time');

fs.writeFileSync('internal/handler/election_results/handler.go', content);
