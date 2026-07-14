const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'tasks');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('0_task_template'));
const todos = files.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { file: f, priority: d.priority, origin: d.origin, title: d.title, state: d.state };
}).filter(t => t.state === 'todo').sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const originOrder = { user: 0, 'user-assisted': 1, ai: 2 };
  return (originOrder[a.origin] || 2) - (originOrder[b.origin] || 2);
});
todos.forEach(t => console.log(`${t.file} | priority=${t.priority} | origin=${t.origin} | ${t.title}`));
