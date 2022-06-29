docker build -t tms/tmw-all .

docker run -it --rm --name tmw-test  tms/tmw-all sh

docker cp nginx.conf.template2 tmw-test:/etc/nginx/nginx.conf 

nohup nginx -g "daemon off;" &>/dev/null &