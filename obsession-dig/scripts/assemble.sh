#!/bin/bash
# Grade (soft bloom, contrast, vignette, fine grain) + original score (-14 LUFS) -> out/obsession_dig.mp4
set -e
cd "$(dirname "$0")/.."
GRADE="format=gbrp,split[a][b];[b]curves=all='0/0 0.6/0.2 1/1',gblur=sigma=22[bl];[a][bl]blend=all_mode=screen:all_opacity=0.35,eq=contrast=1.05:saturation=1.1,vignette=angle=PI/4.8,noise=alls=6:allf=t+u,format=yuv420p"
ffmpeg -v error -y -i out/picture.mp4 -i public/music.wav \
  -filter_complex "[0:v]${GRADE}[v];[1:a]loudnorm=I=-14:TP=-1.0:LRA=11[a]" -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 320k -ar 48000 -t 32 out/obsession_dig.mp4
echo done
