-- +goose Up
CREATE TABLE role_permissions (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE roles (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE role_assigned_permissions (
  role_id SMALLINT,
  permission_id SMALLINT,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id BIGINT,
  role_id SMALLINT,
  PRIMARY KEY (user_id, role_id)
);

-- Seed Default Permissions
INSERT INTO role_permissions (code, description) VALUES 
('manage_users', 'Can create, update, and delete users'),
('manage_parties', 'Can manage political parties'),
('manage_party_members', 'Can manage party members'),
('manage_elections', 'Can manage elections and candidates');

-- Seed Default Roles
INSERT INTO roles (code, name, description) VALUES 
('user', 'User', 'Regular platform user'), 
('admin', 'Admin', 'Standard system administrator'),
('super_admin', 'Super Admin', 'Super administrator with full system access'),
('super_partyadmin', 'Super Party Admin', 'Super administrator for a political party'),
('partyadmin', 'Party Admin', 'Administrator for a political party');

-- Map Permissions to Roles
-- Super Admin and Admin get ALL role_permissions
INSERT INTO role_assigned_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, role_permissions p
WHERE r.code IN ('super_admin', 'admin');

-- Party Admin gets specific role_permissions (example)
INSERT INTO role_assigned_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, role_permissions p
WHERE r.code = 'super_partyadmin' AND p.code IN ('manage_parties', 'manage_party_members', 'manage_elections');

-- +goose Down
DROP TABLE IF EXISTS role_assigned_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
