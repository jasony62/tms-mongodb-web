#!/bin/sh

nohup start_nginx.sh &>/dev/null &

/usr/app/tmw/start_back.sh