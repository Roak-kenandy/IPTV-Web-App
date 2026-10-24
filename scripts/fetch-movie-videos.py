#!/usr/bin/env python3
"""Download the Movies on Demand videos into public/assets/video/movies/.

Every film has an official English trailer (PLAY TRAILER, played in full) and an official scene
from the film (WATCH MOVIE, the first MOVIE_SEC seconds), both from the studios' own YouTube
channels or Movieclips. Re-encoded with ffmpeg to 720p H.264/AAC with a poster frame.
Requires yt-dlp and ffmpeg on PATH.

    python3 scripts/fetch-movie-videos.py              # only files that don't exist yet
    python3 scripts/fetch-movie-videos.py 1917 dora    # (re)fetch specific films
"""
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/assets/video/movies'
MOVIE_SEC = 180
YT = 'https://www.youtube.com/watch?v='

# id (as in content.json) -> (trailer, scene)
SOURCES = {
    '1917': ('YqNYrYUiMfg', 'ISoPy3I6Us4'),
    'mad-max-fury-road': ('hEJnMQG9ev8', 'AWvRcWDr5y8'),
    'mission-impossible-fallout': ('wb49-oV0F78', 'z83IyEgxPrk'),
    'the-grinch': ('vjnqABgxfO0', '5zFt31WL6jc'),
    'dora': ('gUTtJjV852c', 'chE44pUjcZM'),
    'dolittle': ('FEf412bSPLs', 'tGiJDoDNzGQ'),
    'despicable-me-3': ('6DBi41reeF0', 'a_V97KexhWw'),
    'playing-with-fire': ('fd5GlZUpfaM', 'a1RECyj3hCQ'),
    'jumanji': ('2QKg5SZ_35I', 'C0NVo07t9UI'),
}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def download(name, vid, seconds=None):
    with tempfile.TemporaryDirectory(dir=OUT) as tmp:
        cmd = ['yt-dlp', '-q', '--no-playlist', '-f', 'bv*[height<=720]+ba/b[height<=720]/b',
               '-o', f'{tmp}/src.%(ext)s', YT + vid]
        if seconds:
            cmd[1:1] = ['--download-sections', f'*0-{seconds}']
        run(cmd)
        src = next(Path(tmp).glob('src.*'))
        mp4 = OUT / f'{name}.mp4'
        limit = ['-t', str(seconds)] if seconds else []
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), *limit,
             '-vf', 'scale=-2:min(720\\,ih),fps=30', '-c:v', 'libx264', '-preset', 'medium',
             '-crf', '28', '-maxrate', '1600k', '-bufsize', '3200k', '-pix_fmt', 'yuv420p',
             '-c:a', 'aac', '-b:a', '112k', '-ac', '2', '-movflags', '+faststart', str(mp4)])
        # Trailers open with a rating card; a frame a few seconds in makes a better loading poster.
        run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '12', '-i', str(mp4), '-frames:v', '1',
             '-q:v', '4', str(OUT / f'{name}.jpg')])
    return name


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for mid in sys.argv[1:] or SOURCES:
        trailer, scene = SOURCES[mid]
        for name, vid, sec in ((f'{mid}-trailer', trailer, None), (f'{mid}-movie', scene, MOVIE_SEC)):
            if sys.argv[1:] or not (OUT / f'{name}.mp4').exists():
                jobs.append((name, vid, sec))
    with ThreadPoolExecutor(6) as pool:
        for name, fut in [(j[0], pool.submit(download, *j)) for j in jobs]:
            try:
                fut.result()
                print(f'OK   {name}', flush=True)
            except subprocess.CalledProcessError as e:
                err = (e.stderr or '').strip()
                print(f'FAIL {name:<34} {err.splitlines()[-1] if err else e!r}', flush=True)


if __name__ == '__main__':
    main()
