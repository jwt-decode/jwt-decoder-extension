#!/bin/sh
if [ -f dist/jwt-decoder.zip ]; then
  rm dist/jwt-decoder.zip
fi
zip dist/jwt-decoder.zip * -D -x build.sh
