const fs = require('fs');
const path = require('path');

// Simple PNG generator (1x1 pixel PNG)
function createSimplePNG(width, height, r, g, b, a = 255) {
  const PNG = require('pngjs').PNG;
  const png = new PNG({ width, height });
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = r;     // Red
      png.data[idx + 1] = g; // Green
      png.data[idx + 2] = b; // Blue
      png.data[idx + 3] = a; // Alpha
    }
  }
  
  return PNG.sync.write(png);
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

try {
  // Try to use pngjs if available
  require('pngjs');
  
  // Create icon.png (1024x1024) - Blue
  const icon = createSimplePNG(1024, 1024, 74, 144, 226, 255);
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon);
  console.log('Created icon.png');
  
  // Create adaptive-icon.png (1024x1024) - Blue
  const adaptiveIcon = createSimplePNG(1024, 1024, 74, 144, 226, 255);
  fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
  console.log('Created adaptive-icon.png');
  
  // Create splash.png (1242x2436) - White
  const splash = createSimplePNG(1242, 2436, 255, 255, 255, 255);
  fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
  console.log('Created splash.png');
  
  // Create favicon.png (48x48) - Blue
  const favicon = createSimplePNG(48, 48, 74, 144, 226, 255);
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
  console.log('Created favicon.png');
  
  console.log('\nAll asset files created successfully!');
} catch (err) {
  console.log('pngjs not installed. Installing...');
  console.log('Run: npm install pngjs --save-dev');
  console.log('Then run: node generate-assets.js');
}
