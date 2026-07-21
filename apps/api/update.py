import re

path = r"c:\Users\danie\Desktop\Repos\free9ja\apps\api\internal\service\elections\elections_service.go"
with open(path, "r") as f:
    content = f.read()

# Replace all of them to use `nil`
new_content = content.replace(
    'return queries.Election{}, fmt.Errorf("failed to fetch national metrics: %w", err)',
    'return nil, fmt.Errorf("failed to fetch national metrics: %w", err)'
)

# Then we fix the ONE inside CreateNationwideElection back to queries.Election{}
# We can find the function body for CreateNationwideElection and do a targeted replace
pattern = re.compile(
    r'(func \(s \*ElectionsService\) CreateNationwideElection.*?)(func \(s \*ElectionsService\) CreateStateElection)',
    re.DOTALL
)

def fix_nationwide(m):
    body = m.group(1).replace(
        'return nil, fmt.Errorf("failed to fetch national metrics: %w", err)',
        'return queries.Election{}, fmt.Errorf("failed to fetch national metrics: %w", err)'
    )
    return body + m.group(2)

new_content = pattern.sub(fix_nationwide, new_content)

with open(path, "w") as f:
    f.write(new_content)
