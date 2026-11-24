import fs from 'fs';
import path from 'path';

const fontsToDownload = [
  // Estedad
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-Regular.woff2',
    dest: 'public/fonts/estedad/Estedad-Regular.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-Medium.woff2',
    dest: 'public/fonts/estedad/Estedad-Medium.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-SemiBold.woff2',
    dest: 'public/fonts/estedad/Estedad-SemiBold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-Bold.woff2',
    dest: 'public/fonts/estedad/Estedad-Bold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-ExtraBold.woff2',
    dest: 'public/fonts/estedad/Estedad-ExtraBold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad-Black.woff2',
    dest: 'public/fonts/estedad/Estedad-Black.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/aminabedi68/Estedad/master/fonts/webfonts/Estedad[wght].woff2',
    dest: 'public/fonts/estedad/Estedad-Variable.woff2'
  },
  // Vazirmatn
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Regular.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-Regular.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Medium.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-Medium.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-SemiBold.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-SemiBold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Bold.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-Bold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-ExtraBold.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-ExtraBold.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Black.woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-Black.woff2'
  },
  {
    url: 'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn[wght].woff2',
    dest: 'public/fonts/vazirmatn/Vazirmatn-Variable.woff2'
  }
];

async function downloadFile(url, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log(`Saved ${dest} (${buffer.length} bytes)`);
}

async function run() {
  for (const item of fontsToDownload) {
    await downloadFile(item.url, item.dest);
  }
  console.log('All fonts downloaded successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
