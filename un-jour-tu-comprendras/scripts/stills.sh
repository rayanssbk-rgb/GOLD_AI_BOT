#!/bin/bash
# Contact sheet of chosen frames: scripts/stills.sh name f1 f2 ...
name=$1; shift
export REMOTION_BROWSER=${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
for fr in "$@"; do
  npx remotion still src/index.ts UnJour out/frames/$fr.png --frame=$fr --scale=0.4 --gl=swangle --log=error >/tmp/still_$fr.log 2>&1 || { echo "fail $fr"; tail -5 /tmp/still_$fr.log; }
done
args=(); filt=""; i=0
for fr in "$@"; do args+=(-i out/frames/$fr.png); filt+="[$i]drawtext=text='$fr':x=10:y=10:fontsize=28:fontcolor=yellow:box=1:boxcolor=black[v$i];"; i=$((i+1)); done
ins=""; for j in $(seq 0 $((i-1))); do ins+="[v$j]"; done
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${filt}${ins}hstack=$i" out/frames/$name.png
