#!/bin/bash
# Grade (soft bloom, contrast, vignette, fine grain) + soundtrack (loudness -14 LUFS) -> out/obsession.mp4
set -e
cd "$(dirname "$0")/.."
GRADE="format=gbrp,split[a][b];[b]curves=all='0/0 0.55/0.25 1/1',gblur=sigma=28[bl];[a][bl]blend=all_mode=screen:all_opacity=0.32,eq=contrast=1.06:saturation=1.08:gamma=1.12,vignette=angle=PI/4.6,noise=alls=5:allf=t+u,format=yuv420p"
ffmpeg -v error -y -i out/picture.mp4 -i public/soundtrack.wav \
  -filter_complex "[0:v]${GRADE}[v];[1:a]loudnorm=I=-14:TP=-1.0:LRA=11[a]" -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 320k -ar 48000 -t 43 out/obsession.mp4
echo done
