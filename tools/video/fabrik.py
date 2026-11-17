#!/usr/bin/env python3
"""HOCHDRUCK Video-Fabrik: macht aus einer Szenenliste (JSON) ein fertiges MP4 mit Bild, Untertiteln,
Figurenstimmen (Wolkwilisch) und Musik. Alles kommt aus dem Spiel selbst, alle Rechte bei Duchy Games.

Aufruf:   python3 tools/video/fabrik.py tools/video/szenen/short01.json out/short01.mp4
Braucht:  Python 3 mit playwright (pip install playwright), Google Chrome oder Chromium, ffmpeg,
          und einen lokalen Webserver im Spielordner:  python3 -m http.server 8765
"""
import json, sys, os, base64, subprocess, tempfile, shutil, math
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HOCHDRUCK_URL', 'http://localhost:8765/')
CHROME = os.environ.get('CHROME', shutil.which('google-chrome') or shutil.which('chromium') or '/usr/bin/google-chrome')
HERE = os.path.dirname(os.path.abspath(__file__))
MUSIK = os.path.join(HERE, 'musik')

CSS = """
#vf-sub{position:fixed;left:6%;right:6%;bottom:13%;text-align:center;font:700 var(--vfs,58px)/1.18 Georgia,serif;color:#fff;
  -webkit-text-stroke:2px #1c2130;paint-order:stroke fill;text-shadow:0 4px 0 #1c2130,0 0 18px rgba(0,0,0,.45);z-index:99;pointer-events:none}
#vf-sub small{display:block;font:600 calc(var(--vfs,58px)*.55)/1.3 Georgia,serif;margin-top:10px;-webkit-text-stroke:1.2px #1c2130}
#vf-sub .lg{display:block;font:italic 600 calc(var(--vfs,58px)*.6)/1.3 Georgia,serif;color:#F2D58A;margin-bottom:8px}
#vf-card{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:#F4EFE4;z-index:100;text-align:center;color:#2A2E38}
#vf-card h1{font:400 var(--vfc,150px)/1 Georgia,serif;margin:0}#vf-card p{font:italic 600 calc(var(--vfc,150px)*.3) Georgia,serif;color:#C8352B;margin:18px 0 0}
#vf-card small{font:600 calc(var(--vfc,150px)*.18) Helvetica,Arial,sans-serif;letter-spacing:.2em;color:#6B6F78;margin-top:40px}
"""

def ease(t): return t * t * (3 - 2 * t)
def lerp(a, b, t): return [x + (y - x) * t for x, y in zip(a, b)]

def record_audio(pg, js):
    return pg.evaluate("""async (js) => { const A=window.__A, LG=window.__LG, ac=A.ctx(); const dest=ac.createMediaStreamDestination(); window.__tap(dest);
      const r=new MediaRecorder(dest.stream), ch=[]; r.ondataavailable=e=>ch.push(e.data); r.start(); await new Promise(z=>setTimeout(z,120));
      const d=(new Function('A','LG', 'return ' + js))(A, LG) || 1; await new Promise(z=>setTimeout(z, d*1000+450)); r.stop(); await new Promise(z=>r.onstop=z);
      const u=new Uint8Array(await new Blob(ch).arrayBuffer()); let s=''; for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }""", js)

def main(spec_path, out_path):
    spec = json.load(open(spec_path, encoding='utf-8'))
    wide = spec.get('format', 'short') == 'wide'
    W, H = (1920, 1080) if wide else (1080, 1920)
    fps = int(os.environ.get('VF_FPS', spec.get('fps', 30)))   # VF_FPS=2 für eine schnelle Vorschau
    scenes = spec['scenes']
    tmp = tempfile.mkdtemp(prefix='vf_')
    total = sum(s['dur'] for s in scenes)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        # 1) Stimmen aufnehmen (in Echtzeit, auf der Audio-Testseite)
        ap = b.new_page(); ap.goto(BASE + 'tools/video/audio.html'); ap.wait_for_timeout(600)
        ap.evaluate("async()=>{const A=window.__A;A.ensureAudio();A.setMuted(false);A.setMusic('none');await A.ctx().resume();}")
        clips, t0 = [], 0.0
        for i, s in enumerate(scenes):
            for k, a in enumerate(s.get('audio', [])):
                if 'say' in a:
                    js = "A.speak(LG.syllables(%s), A.voiceFor(%s), {interrupt:true, mood:%s, max:30, noGesture:%s})" % (json.dumps(a['say']), json.dumps(a.get('who', 'Gemeindeschreiber')), json.dumps(a.get('mood', '')), 'true' if a.get('plain', True) else 'false')
                elif 'gesture' in a:
                    js = "A.gesture(%s, A.voiceFor(%s))" % (json.dumps(a['gesture']), json.dumps(a.get('who', 'Gemeindeschreiber')))
                elif 'bells' in a:
                    js = "(A.churchBells(%d), %d * 0.75 + 2.5)" % (a['bells'], a['bells'])
                else: continue
                f = os.path.join(tmp, 'a%02d_%02d.webm' % (i, k)); open(f, 'wb').write(base64.b64decode(record_audio(ap, js)))
                clips.append((t0 + a.get('at', 0.0), f, a.get('gain', 1.0)))
            t0 += s['dur']
        ap.close()
        # 2) Bilder rendern, Bild für Bild mit festem Zeitschritt
        sc = float(spec.get('render_scale', os.environ.get('VF_SCALE', 0.6667)))   # kleiner rendern, dann hochskalieren (schneller)
        pg = b.new_page(viewport={'width': int(W * sc), 'height': int(H * sc)}, locale=spec.get('locale', 'de-CH'))
        pg.goto(BASE); pg.wait_for_timeout(9000)
        pg.add_style_tag(content=CSS)
        pg.evaluate("""([wide, sc]) => { window.__offline = true; window.V=(x,y,z)=>new __THREE.Vector3(x,y,z);
          document.querySelectorAll('.overlay,#menu,#hud,#prompt,#tut,#tags,#intro').forEach(e=>{e.classList.add('hidden'); e.style.display='none';});
          const sub=document.createElement('div'); sub.id='vf-sub'; document.body.appendChild(sub);
          const card=document.createElement('div'); card.id='vf-card'; document.body.appendChild(card);
          document.documentElement.style.setProperty('--vfs', (wide ? 52 : 62) * sc + 'px'); document.documentElement.style.setProperty('--vfc', (wide ? 170 : 140) * sc + 'px');
          __world.orbitOn=false; __world.enabled=true; __world.resize(); }""", [wide, sc])
        dt, n = 1.0 / fps, 0
        for s in scenes:
            if s.get('js'): pg.evaluate("() => { " + s['js'] + " }")
            pg.evaluate("(d) => { __world.setDusk(d); }", s.get('dusk', 0))
            card = s.get('card')
            pg.evaluate("""(c) => { const el=document.getElementById('vf-card'); if(!c){el.style.display='none';return;}
              el.innerHTML='<h1></h1><p></p><small></small>'; el.querySelector('h1').textContent=c.title||''; el.querySelector('p').textContent=c.line||''; el.querySelector('small').textContent=c.small||''; el.style.display='flex'; }""", card)
            frames = int(round(s['dur'] * fps))
            cam = s.get('cam'); walk = s.get('walk')
            if walk: pg.evaluate("(w) => { __world.teleport(w.from[0],0,w.from[1]); }", walk)
            subs = s.get('subs', [])
            for f in range(frames):
                tt = f / max(1, frames - 1)
                if cam:
                    c = lerp(cam['from'], cam.get('to', cam['from']), ease(tt))
                    pg.evaluate("(c) => { __world.hold = { pos: V(c[0],c[1],c[2]), look: V(c[3],c[4],c[5]) }; }", c)
                if walk:
                    pg.evaluate("""(w) => { const p=__world.player.pos, dx=w.to[0]-p.x, dz=w.to[1]-p.z, l=Math.hypot(dx,dz);
                      if (l > 0.35) { const yaw=Math.atan2(-dx/l,-dz/l); __world.camYaw=__world.camYawT=yaw; __world.keys.add('f'); } else __world.keys.delete('f'); }""", walk)
                ts = f / fps
                cur = [x for x in subs if x.get('from', 0) <= ts < x.get('to', 999)]
                pg.evaluate("""(x) => { const el=document.getElementById('vf-sub'); if(!x){el.innerHTML='';return;}
                  el.innerHTML=''; if(x.lingo){const a=document.createElement('span');a.className='lg';a.textContent='«'+x.lingo+'»';el.appendChild(a);}
                  el.appendChild(document.createTextNode(x.text||'')); if(x.small){const s=document.createElement('small');s.textContent=x.small;el.appendChild(s);} }""", cur[0] if cur else None)
                pg.evaluate("(dt) => __frame(dt)", dt)
                pg.screenshot(path=os.path.join(tmp, 'f%05d.jpg' % n), type='jpeg', quality=92); n += 1
            pg.evaluate("() => { __world.keys.clear(); }")
        b.close()
    # 3) Zusammensetzen: Bilder + Musik + Stimmen
    video = os.path.join(tmp, 'v.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%05d.jpg'), '-vf', 'scale=%d:%d:flags=lanczos' % (W, H), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', video], check=True)
    inputs, filt, mix = ['-i', video], [], []
    music = spec.get('music')
    idx = 1
    if music:
        inputs += ['-stream_loop', '-1', '-i', os.path.join(MUSIK, music + '.mp3')]
        filt.append('[%d:a]atrim=0:%.2f,volume=%.2f,afade=t=in:d=0.6,afade=t=out:st=%.2f:d=1.5[m]' % (idx, total, spec.get('music_gain', 0.45), max(0, total - 1.5)))
        mix.append('[m]'); idx += 1
    for k, (at, f, g) in enumerate(clips):
        inputs += ['-i', f]
        filt.append('[%d:a]volume=%.2f,adelay=%d|%d[c%d]' % (idx, g, int(at * 1000), int(at * 1000), k)); mix.append('[c%d]' % k); idx += 1
    if mix:
        filt.append('%samix=inputs=%d:normalize=0:duration=longest,atrim=0:%.2f,loudnorm=I=-14:TP=-1.5[a]' % (''.join(mix), len(mix), total))
        cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out_path]
    else:
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-c', 'copy', out_path]
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print('fertig:', out_path, '(%d Bilder, %.1f s)' % (n, total))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
