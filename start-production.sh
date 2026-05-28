#!/bin/bash
cd /home/ubuntu/apps/wsystem-1
export PORT=3001
export NEXT_PUBLIC_APP_URL=http://43.153.224.59:3001
exec npx next start --port 3001
