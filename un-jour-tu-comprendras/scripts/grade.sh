#!/bin/bash
# Cinematic finishing pass: bloom on highlights, teal/orange grade, contrast, vignette, film grain.
# Usage: scripts/grade.sh in.mp4 out.mp4   (or an image for previews)
in=$1; out=$2
GRADE="split=2[base][hi];[hi]curves=all='0/0 0.6/0 1/1',gblur=sigma=26[glow];[base][glow]blend=all_mode=screen:all_opacity=0.5,curves=r='0/0.01 0.5/0.5 1/1':g='0/0.015 0.5/0.49 1/0.98':b='0/0.05 0.5/0.48 1/0.9',eq=contrast=1.07:saturation=0.94:gamma=1.02,vignette=angle=PI/5.2,noise=alls=5:allf=t+u"
if [[ "$in" == *.png ]]; then
  ffmpeg -loglevel error -y -i "$in" -vf "$GRADE" "$out"
else
  ffmpeg -loglevel error -y -i "$in" -vf "scale=in_range=full:out_range=tv,$GRADE,format=yuv420p" \
    -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 320k -ar 44100 -movflags +faststart "$out"
fi
