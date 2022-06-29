docker build -t tms/tmw-all .

docker run -it --rm --name tmw-test  tms/tmw-all sh