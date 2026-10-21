"""Render Icônette brand assets (icons, DMG background, NSIS bitmaps) from brand.html.
Needs: pip install playwright pillow, a Chromium, then run `pnpm tauri icon` (done by this script)."""
import asyncio, os, subprocess, sys
from PIL import Image
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); OUT = os.path.join(HERE, 'out')
CHROME = os.environ.get('CHROMIUM', '/usr/bin/chromium')
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for a, (w, h) in {'icon': (1024, 1024), 'icon-macos': (1024, 1024), 'dmg': (660, 400), 'sidebar': (164, 314), 'header': (150, 57)}.items():
            pg = await b.new_page(viewport={'width': w, 'height': h})
            await pg.goto(f'file://{HERE}/brand.html?a={a}'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{OUT}/{a}.png', omit_background=a.startswith('icon'))
            if a == 'icon':
                with open(f'{HERE}/logo.svg', 'w') as f: f.write(await pg.evaluate("ASSET.logo[2]"))
        await b.close()
    nsis = os.path.join(ROOT, 'src-tauri', 'nsis'); dmg = os.path.join(ROOT, 'src-tauri', 'dmg')
    os.makedirs(nsis, exist_ok=True); os.makedirs(dmg, exist_ok=True)
    Image.open(f'{OUT}/sidebar.png').convert('RGB').save(f'{nsis}/sidebar.bmp')
    Image.open(f'{OUT}/header.png').convert('RGB').save(f'{nsis}/header.bmp')
    Image.open(f'{OUT}/dmg.png').convert('RGB').save(f'{dmg}/background.png')
    tauri = os.path.join(ROOT, 'node_modules', '.bin', 'tauri')
    subprocess.run([tauri, 'icon', f'{OUT}/icon.png', '-o', os.path.join(ROOT, 'src-tauri', 'icons')], check=True)
    subprocess.run([tauri, 'icon', f'{OUT}/icon-macos.png', '-o', os.path.join(ROOT, 'src-tauri', 'icons', 'macos')], check=True)
asyncio.run(main())
