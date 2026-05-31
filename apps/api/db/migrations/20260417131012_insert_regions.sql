-- +goose Up
INSERT INTO c_regions (name) VALUES
('Africa'), ('Americas'), ('Asia'), ('Europe'), ('Oceania'), ('Polar');

INSERT INTO c_subregions (name, region_id) VALUES
('Northern Africa', 1),
('Middle Africa', 1),
('Western Africa', 1),
('Eastern Africa', 1),
('Southern Africa', 1),
('Northern America', 2),
('Caribbean', 2),
('South America', 2),
('Central America', 2),
('Central Asia', 3),
('Western Asia', 3),
('Eastern Asia', 3),
('South-Eastern Asia', 3),
('Southern Asia', 3),
('Eastern Europe', 4),
('Southern Europe', 4),
('Western Europe', 4),
('Northern Europe', 4),
('Australia and New Zealand', 5),
('Melanesia', 5),
('Micronesia', 5),
('Polynesia', 5);

-- +goose Down
SELECT 'down SQL query';
