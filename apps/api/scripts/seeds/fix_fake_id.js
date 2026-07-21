const fs = require('fs');
const file = 'seed_users.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

let currentFakeId = 100000;
data.forEach((user, index) => {
  user.fake_id = currentFakeId + index;
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Fixed fake_ids');
