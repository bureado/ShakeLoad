FROM dockerfile/nodejs

RUN \
  cd /data && \
  git clone https://github.com/bureado/ShakeLoad

RUN \
  cd /data/ShakeLoad && \
  npm install

WORKDIR /data/ShakeLoad

CMD ["node", "/data/ShakeLoad/app.js"]

