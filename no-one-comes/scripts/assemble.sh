#!/bin/bash
# parts -> cinematic grade (bloom, warm highlights / cool shadows, contrast, vignette, fine grain)
# -> crisp subtitles composited after the grade -> sound normalised for TikTok (-14 LUFS).
set -e
cd "$(dirname "$0")/.."
printf "file 'partA.mp4'\nfile 'partB.mp4'\n" > out/parts.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/parts.txt -c copy out/picture.mp4
GRADE="split=2[base][hi];[hi]curves=all='0/0 0.55/0 1/1',gblur=sigma=24[glow];[base][glow]blend=all_mode=screen:all_opacity=0.55,curves=r='0/0.015 0.5/0.51 1/1':g='0/0.01 0.5/0.49 1/0.98':b='0/0.06 0.5/0.5 1/0.93',eq=contrast=1.08:saturation=1.06:gamma=1.0,vignette=angle=PI/5,noise=alls=4:allf=t+u"
ffmpeg -loglevel error -y -i out/picture.mp4 -i out/subs.mov -i public/soundtrack.wav \
  -filter_complex "[0:v]scale=in_range=full:out_range=tv,${GRADE}[g];[g][1:v]overlay=format=auto,format=yuv420p[v];[2:a]loudnorm=I=-14:TP=-1.0:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -r 30 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -t 40 -movflags +faststart out/no-one-comes.mp4
echo "done: out/no-one-comes.mp4"
