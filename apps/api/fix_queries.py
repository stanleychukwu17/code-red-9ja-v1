import re

with open(r'c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\query\bodies.sql', 'r') as f:
    content = f.read()

# Replace SELECT <fields> FROM <table_name> with SELECT * FROM <table_name>
content = re.sub(r'SELECT (id, name.*?|id, name, iso2) FROM', r'SELECT * FROM', content)

# Replace RETURNING <fields>; with RETURNING *;
content = re.sub(r'RETURNING id, name.*?;', r'RETURNING *;', content)

with open(r'c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\query\bodies.sql', 'w') as f:
    f.write(content)

print("Done replacing.")
