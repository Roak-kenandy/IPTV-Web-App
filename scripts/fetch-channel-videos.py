#!/usr/bin/env python3
"""Download a demo clip for every TV channel into public/assets/video/channels/.

Each channel is searched on YouTube, a section is downloaded with yt-dlp, then re-encoded with
ffmpeg to 720p H.264/AAC with a poster frame. Requires yt-dlp and ffmpeg on PATH.

    python3 scripts/fetch-channel-videos.py            # only channels without a clip yet
    python3 scripts/fetch-channel-videos.py TRACE CNN  # (re)fetch specific channels
"""
import json
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/assets/video/channels'
CLIP_SEC = 60

# id -> YouTube search query, or "https://..." for a specific video. FULL plays the whole video.
# INHOUSE (HOTEL TV) has no entry: it reuses the welcome video. English entertainment channels
# show blockbuster trailers / music videos, which look better on a demo than channel idents.
FULL = {'TRACE'}
SOURCES = {
    'TRACE': 'https://www.youtube.com/watch?v=mw3kSNIxjqo',
    'SONY5HD': 'Sony Sports Ten 5 promo',
    'AXN': 'Mission Impossible Dead Reckoning official trailer',
    'SSPORT2': 'https://www.youtube.com/watch?v=Nkvcz0Mox3w',
    'SONYSP2': 'Sony Sports Ten 2 promo',
    'STARSP2': 'Star Sports 2 promo',
    'BBCW': 'BBC News Click technology',
    'WARNER': 'The Batman official trailer Warner Bros',
    'HGTV': 'HGTV promo',
    'NICK': 'SpongeBob SquarePants Nickelodeon promo',
    'STARSD': 'Star Plus promo',
    'ZEESD': 'Kundali Bhagya Zee TV promo',
    'SONYBBC': 'Sony BBC Earth promo',
    'CINEW': 'Top Gun Maverick official trailer',
    'CNN': 'CNN Travel',
    'SONYPIX': 'Spider-Man No Way Home official trailer',
    'CARTN': 'Cartoon Network promo',
    'ROCKACTION': 'John Wick Chapter 4 official trailer',
    'DISNEYINTL': 'Disney Channel promo',
    'ZEECL': 'Zee Classic channel',
    'ZOOM': 'Zoom TV Bollywood',
    'CARTNSD': 'Cartoon Network Ben 10 promo',
    'ZEEBLSD': 'Zee Bollywood promo',
    'SONYTEN1': 'Sony Sports Ten 1 promo',
    'KBSW': 'KBS World promo',
    'SUPERRIX': 'Avengers Endgame official trailer',
    'CINEEDGE': 'Dune Part Two official trailer',
    'STARSPHD': 'Star Sports 1 promo cricket',
    'PLTV': 'Premier League TV highlights',
    'EUROSP': 'Eurosport promo',
    'TLCHD': 'TLC channel promo',
    'ZEECINE': 'Zee Cinema promo',
    'COLORS': 'Colors Cineplex promo',
    'DISCHD': 'Discovery Channel promo',
    'SONYMAXHD2': 'Sony Max promo',
    'ROCKENT': 'Avatar The Way of Water official trailer',
    'ZEETVHD': 'Zee TV HD serial promo',
    'STARGOLD': 'Star Gold promo',
    'COLORSHD': 'Colors TV promo',
    'STARPLHD': 'Star Plus HD serial promo',
    'SONYENTHD': 'Sony Entertainment Television promo',
    'BBCBEE': 'CBeebies',
    'NICKJRHD': 'Nick Jr promo',
    'SPORT1HD': 'Sport1 HD channel promo',
    'MOONB': 'Moonbug Kids',
    'CARNITO': 'Cartoonito promo',
    'TDC': 'TDC TV Maldives',
    'TVN': 'tvN Korea drama promo',
    'MTVHD': 'Mark Ronson Uptown Funk ft Bruno Mars official video',
    'HITS': 'Jurassic World Dominion official trailer',
    'STARSPSL1': 'Star Sports Select 1 promo',
    'ALJAZEERAINT': 'Al Jazeera English Inside Story',
    'CURIOSITY': 'CuriosityStream trailer',
    'SKYNEWS': 'Sky News Swarm technology',
    'CNA': 'CNA Insider',
    'CGTN': 'CGTN documentary',
    'TRTWORLD': 'TRT World Showcase',
    'RUSSIATODAY': 'RT documentary',
    'NDTV': 'NDTV news report India',
    'NHK': 'NHK World Japan',
    'ALJAZEERAARB': 'الجزيرة الوثائقية طبيعة',
    'RAIITALIA': 'Rai Italia Linea Blu',
    'FOODNETWORK': 'Food Network promo',
    'HUMMASALA': 'Masala TV cooking show',
    'LOVENATURE': 'Love Nature wildlife trailer',
    'FASHIONTV': 'Fashion TV runway',
    'GEOENTERTAINMENT': 'Geo Entertainment drama promo',
    'HITSNOW': 'Fast X official trailer',
    'MYZEN': 'MyZen TV relaxation',
    'HUMTV': 'Hum TV drama promo',
    'HALLMOVIES': 'Wonka official trailer',
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def candidates(query):
    """Non-live search results between 20 s and 30 min long: [(url, duration, title)]."""
    if query.startswith('http'):
        meta = json.loads(run(['yt-dlp', '-j', '--no-playlist', query]))
        return [(query, meta['duration'], meta['title'])]
    out = run(['yt-dlp', '--flat-playlist', '--print', '%(id)s\t%(duration)s\t%(title)s',
               f'ytsearch15:{query}'])
    found = []
    for line in out.splitlines():
        vid, dur, title = line.split('\t', 2)
        if dur not in ('NA', 'None') and 20 <= float(dur) <= 1800:
            found.append((f'https://www.youtube.com/watch?v={vid}', float(dur), title))
    if not found:
        raise RuntimeError(f'no usable result for {query!r}')
    return found


def fetch(cid):
    err = None
    for url, dur, title in candidates(SOURCES[cid])[:3]:
        try:
            download(cid, url, dur)
            return cid, f'{url}  {title}'
        except subprocess.CalledProcessError as e:
            err = e
    raise err


def download(cid, url, dur):
    full = cid in FULL
    start = 0 if full or dur <= CLIP_SEC + 20 else min(15, dur - CLIP_SEC)
    length = dur if full else min(CLIP_SEC, dur - start)
    with tempfile.TemporaryDirectory(dir=OUT) as tmp:
        cmd = ['yt-dlp', '-q', '--no-playlist', '-f', 'bv*[height<=720]+ba/b[height<=720]/b',
               '-o', f'{tmp}/src.%(ext)s', url]
        if not full:
            cmd[1:1] = ['--download-sections', f'*{start}-{start + length}']
        run(cmd)
        src = next(Path(tmp).glob('src.*'))
        mp4 = OUT / f'{cid}.mp4'
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-t', str(length),
             '-vf', 'scale=-2:min(720\\,ih),fps=30', '-c:v', 'libx264', '-preset', 'veryfast',
             '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
             '-movflags', '+faststart', str(mp4)])
        run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '2', '-i', str(mp4), '-frames:v', '1',
             '-q:v', '4', str(OUT / f'{cid}.jpg')])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ids = sys.argv[1:] or [c for c in SOURCES if not (OUT / f'{c}.mp4').exists()]
    with ThreadPoolExecutor(6) as pool:
        for cid, fut in [(c, pool.submit(fetch, c)) for c in ids]:
            try:
                print(f'OK   {cid:<18} {fut.result()[1]}', flush=True)
            except Exception as e:
                err = (getattr(e, 'stderr', '') or str(e)).strip()
                print(f'FAIL {cid:<18} {err.splitlines()[-1] if err else e!r}', flush=True)


if __name__ == '__main__':
    main()
