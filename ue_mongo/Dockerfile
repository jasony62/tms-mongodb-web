FROM alpine:latest
ENV ng_config /usr/local/nginx-1.16.0
ADD nginx-1.16.0.tar.gz /usr/local/

RUN CONFIG="\
--prefix=/usr/local/nginx \
--user=nginx \
--group=nginx \
--with-http_ssl_module \
--with-http_gzip_static_module \
--with-http_image_filter_module \
--with-http_stub_status_module \
" \

&& addgroup -S nginx \
&& adduser -D -S -h /var/cache/nginx -s /sbin/nologin -G nginx nginx \
&& sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
&& apk update \
&& apk add --no-cache --virtual .build-deps \
gcc g++ pcre pcre-dev expat-dev perl zlib-dev libxml2-dev make openssl openssl-dev bzip2-dev gd gd-dev \
&& rm -rf /var/cache/apk/* \

&& cd $ng_config \
&& ./configure $CONFIG \
&& sed -ri "s/-Werror//" $ng_config/objs/Makefile \
&& make \
&& make install \

#######################清除虚包#########################
&& runDeps="$( \
scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \
| tr ',' '\n' \
| sort -u \
| awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \
)" \
&& apk add --no-cache $runDeps \
&& apk del  .build-deps \
&& rm -rf $ng_config
########################################################

expose 80 443
WORKDIR /usr/local/nginx/
RUN mkdir -p /usr/src/app
ADD dist /usr/src/app/dist/
ENTRYPOINT [ "./sbin/nginx" ,"-g" ,"daemon off;"]

