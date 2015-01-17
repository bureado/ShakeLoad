FROM dockerfile/nodejs

RUN \
  cd /data && \
  git clone https://github.com/bureado/ShakeLoad

RUN \
  cd /data/ShakeLoad && \
  npm install

RUN\
  cd /data/ShakeLoad && \
  sed -i 's/SUBWITHKEY/your-key-here/' *.js

WORKDIR /data/ShakeLoad

CMD ["node", "/data/ShakeLoad/app.js"]
