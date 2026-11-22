#!/bin/bash
# Concatenate the rendered parts, apply the cinematic grade and mux the soundtrack.
set -e
cd "$(dirname "$0")/.."
printf "file 'partA.mp4'\nfile 'partB.mp4'\n" > out/parts.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/parts.txt -c copy out/master_video.mp4
GRADE="split=2[base][hi];[hi]curves=all='0/0 0.6/0 1/1',gblur=sigma=26[glow];[base][glow]blend=all_mode=screen:all_opacity=0.5,curves=r='0/0.01 0.5/0.5 1/1':g='0/0.015 0.5/0.49 1/0.98':b='0/0.05 0.5/0.48 1/0.9',eq=contrast=1.07:saturation=0.94:gamma=1.02,vignette=angle=PI/5.2,noise=alls=5:allf=t+u"
ffmpeg -loglevel error -y -i out/master_video.mp4 -i public/soundtrack.wav \
  -filter_complex "[0:v]scale=in_range=full:out_range=tv,${GRADE},format=yuv420p[v]" -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.2 -r 30 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 44100 -shortest -movflags +faststart out/un-jour-tu-comprendras.mp4
echo "done: out/un-jour-tu-comprendras.mp4"
