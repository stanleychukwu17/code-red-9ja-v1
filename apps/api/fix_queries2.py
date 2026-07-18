import re

with open(r'c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\query\bodies.sql', 'r') as f:
    content = f.read()

# Replace full row SELECTs
content = content.replace(
    'SELECT id, name, description, coalition_center, state_id, state_name FROM senatorial_districts',
    'SELECT * FROM senatorial_districts'
)
content = content.replace(
    'SELECT id, name, state_id, state_name, senatorial_district_id, senatorial_district_name FROM federal_constituencies',
    'SELECT * FROM federal_constituencies'
)
content = content.replace(
    'SELECT id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM state_assembly_constituencies',
    'SELECT * FROM state_assembly_constituencies'
)
content = content.replace(
    'SELECT id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM lgas',
    'SELECT * FROM lgas'
)
content = content.replace(
    'SELECT id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name FROM wards',
    'SELECT * FROM wards'
)
content = content.replace(
    'SELECT id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id FROM polling_units',
    'SELECT * FROM polling_units'
)
content = content.replace(
    'SELECT id, name, country_id, country_code, latitude, longitude FROM c_states',
    'SELECT * FROM c_states'
)

# Replace full row RETURNINGs
content = content.replace(
    'RETURNING id, name, country_id, country_code, latitude, longitude;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, state_id, state_name, senatorial_district_id, senatorial_district_name;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, description, coalition_center, state_id, state_name;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id;',
    'RETURNING *;'
)
content = content.replace(
    'RETURNING id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;',
    'RETURNING *;'
)

# Append Recalculate statements
recalc = """

-- name: RecalculateWardMetrics :exec
UPDATE wards w
SET polling_units_count = COALESCE((SELECT COUNT(*) FROM polling_units pu WHERE pu.ward_id = w.id), 0);

-- name: RecalculateStateAssemblyConstituencyMetrics :exec
UPDATE state_assembly_constituencies sac
SET wards_count = COALESCE((SELECT COUNT(*) FROM wards w WHERE w.state_assembly_constituency_id = sac.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM wards w WHERE w.state_assembly_constituency_id = sac.id), 0);

-- name: RecalculateLGAMetrics :exec
UPDATE lgas l
SET state_constituencies_count = COALESCE((SELECT COUNT(*) FROM state_assembly_constituencies sac WHERE sac.lga_id = l.id), 0),
    wards_count = COALESCE((SELECT COUNT(*) FROM wards w WHERE w.lga_id = l.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM wards w WHERE w.lga_id = l.id), 0);

-- name: RecalculateFederalConstituencyMetrics :exec
UPDATE federal_constituencies fc
SET lgas_count = COALESCE((SELECT COUNT(*) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0);

-- name: RecalculateSenatorialDistrictMetrics :exec
UPDATE senatorial_districts sd
SET federal_constituencies_count = COALESCE((SELECT COUNT(*) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    lgas_count = COALESCE((SELECT SUM(lgas_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0);

-- name: RecalculateStateMetrics :exec
UPDATE c_states s
SET senatorial_districts_count = COALESCE((SELECT COUNT(*) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    federal_constituencies_count = COALESCE((SELECT SUM(federal_constituencies_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    lgas_count = COALESCE((SELECT SUM(lgas_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0);
"""
content += recalc

with open(r'c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\query\bodies.sql', 'w') as f:
    f.write(content)

print("Done fixing specifically.")
