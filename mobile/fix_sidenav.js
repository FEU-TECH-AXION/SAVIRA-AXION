const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/alexa/Downloads/SAVIRA/mobile/app/(complainant)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Remove function SideNav
  const sideNavRegex = /(?:\/\/[^\n]*Side Nav[^\n]*\r?\n)*(?:function SideNav\([\s\S]*?<\/Modal>\s*\r?\n})/g;
  if (sideNavRegex.test(content)) {
    content = content.replace(sideNavRegex, '');
    changed = true;
  }

  // Remove const nav = StyleSheet.create
  const navStyleRegex = /const nav = StyleSheet\.create\({[\s\S]*?}\);\r?\n/g;
  if (navStyleRegex.test(content)) {
    content = content.replace(navStyleRegex, '');
    changed = true;
  }

  if (changed && !content.includes('import SideNav from')) {
    // Insert import after the last import statement
    const importRegex = /(import [^\n]+;\r?\n)+/;
    content = content.replace(importRegex, match => match + "import SideNav from '../../components/SideNav';\n\n");
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', f);
  }
});
